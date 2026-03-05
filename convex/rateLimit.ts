/**
 * Rate Limiting for HIPAA Compliance
 *
 * Provides brute force protection for authentication endpoints.
 * Tracks request rates per identifier (email or IP) and blocks
 * excessive attempts.
 */

import type { MutationCtx, QueryCtx } from "./_generated/server";

// Configuration
const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minute window
  maxRequests: 10, // 10 attempts per window
  blockDurationMs: 60 * 60 * 1000, // 1 hour block after exceeding
};

const LOGIN_RATE_LIMIT = {
  windowMs: 5 * 60 * 1000, // 5 minute window
  maxRequests: 5, // 5 attempts per window
  blockDurationMs: 30 * 60 * 1000, // 30 minute block
};

export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // ms until retry is allowed
  blocked: boolean;
};

/**
 * Check if an identifier is rate limited
 * @param ctx - Convex mutation context
 * @param identifier - The identifier to check (email, IP, etc.)
 * @param type - The type of rate limit to apply
 * @returns RateLimitResult indicating if request is allowed
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  identifier: string,
  type: "auth" | "login" = "auth"
): Promise<RateLimitResult> {
  const config = type === "login" ? LOGIN_RATE_LIMIT : AUTH_RATE_LIMIT;
  const key = `${type}:${identifier}`;
  const now = Date.now();

  // Get existing tracking record
  const existing = await ctx.db
    .query("rateLimitTracking")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  // Check if currently blocked
  if (existing?.isBlocked && existing.blockedUntil && existing.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: existing.blockedUntil - now,
      blocked: true,
    };
  }

  // Check if within current window
  if (existing && now - existing.windowStart < config.windowMs) {
    const newCount = existing.requestCount + 1;

    if (newCount > config.maxRequests) {
      // Block the identifier
      const blockedUntil = now + config.blockDurationMs;
      await ctx.db.patch(existing._id, {
        requestCount: newCount,
        isBlocked: true,
        blockedUntil,
        lastRequestAt: now,
      });

      return {
        allowed: false,
        remaining: 0,
        retryAfter: config.blockDurationMs,
        blocked: true,
      };
    }

    // Update count
    await ctx.db.patch(existing._id, {
      requestCount: newCount,
      lastRequestAt: now,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - newCount,
      blocked: false,
    };
  }

  // Start new window
  if (existing) {
    // Reset existing record
    await ctx.db.patch(existing._id, {
      windowStart: now,
      requestCount: 1,
      isBlocked: false,
      blockedUntil: undefined,
      lastRequestAt: now,
    });
  } else {
    // Create new record
    await ctx.db.insert("rateLimitTracking", {
      key,
      windowStart: now,
      requestCount: 1,
      isBlocked: false,
      lastRequestAt: now,
    });
  }

  return {
    allowed: true,
    remaining: config.maxRequests - 1,
    blocked: false,
  };
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 * @param ctx - Convex mutation context
 * @param identifier - The identifier to reset
 * @param type - The type of rate limit
 */
export async function resetRateLimit(
  ctx: MutationCtx,
  identifier: string,
  type: "auth" | "login" = "auth"
): Promise<void> {
  const key = `${type}:${identifier}`;

  const existing = await ctx.db
    .query("rateLimitTracking")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

/**
 * Check rate limit without incrementing (for queries)
 * @param ctx - Convex query context
 * @param identifier - The identifier to check
 * @param type - The type of rate limit
 * @returns Whether the identifier is currently blocked
 */
export async function isRateLimited(
  ctx: QueryCtx,
  identifier: string,
  type: "auth" | "login" = "auth"
): Promise<boolean> {
  const key = `${type}:${identifier}`;
  const now = Date.now();

  const existing = await ctx.db
    .query("rateLimitTracking")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!existing) return false;

  return existing.isBlocked && !!existing.blockedUntil && existing.blockedUntil > now;
}

/**
 * Clean up expired rate limit records
 * Should be called periodically via cron job
 * @param ctx - Convex mutation context
 */
export async function cleanupExpiredRecords(ctx: MutationCtx): Promise<number> {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000; // Records older than 24 hours

  const oldRecords = await ctx.db
    .query("rateLimitTracking")
    .withIndex("by_windowStart", (q) => q.lt("windowStart", cutoff))
    .collect();

  let deleted = 0;
  for (const record of oldRecords) {
    // Don't delete if still blocked
    if (record.isBlocked && record.blockedUntil && record.blockedUntil > now) {
      continue;
    }
    await ctx.db.delete(record._id);
    deleted++;
  }

  return deleted;
}
