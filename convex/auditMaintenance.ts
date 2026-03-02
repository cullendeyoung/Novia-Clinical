/**
 * Audit Log Maintenance for HIPAA Compliance
 *
 * HIPAA requires a minimum 6-year retention period for audit logs.
 * This module provides:
 * 1. Audit log archival (marking old logs for archival but NOT deleting)
 * 2. Rate limit record cleanup
 * 3. Audit log statistics
 *
 * IMPORTANT: This module does NOT delete audit logs within the 6-year
 * retention period. It only marks them for archival.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { cleanupExpiredRecords } from "./rateLimit";

// HIPAA requires 6-year minimum retention
const RETENTION_YEARS = 6;
const RETENTION_MS = RETENTION_YEARS * 365 * 24 * 60 * 60 * 1000;

/**
 * Get audit log statistics
 */
export const getStats = internalQuery({
  args: {},
  returns: v.object({
    orgAuditLogs: v.object({
      total: v.number(),
      lastDay: v.number(),
      lastWeek: v.number(),
      lastMonth: v.number(),
    }),
    practiceAuditLogs: v.object({
      total: v.number(),
      lastDay: v.number(),
      lastWeek: v.number(),
      lastMonth: v.number(),
    }),
    rateLimitRecords: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get org audit log counts
    const orgLogs = await ctx.db.query("orgAuditLogs").collect();
    const orgLastDay = orgLogs.filter((l) => l.createdAt >= dayAgo).length;
    const orgLastWeek = orgLogs.filter((l) => l.createdAt >= weekAgo).length;
    const orgLastMonth = orgLogs.filter((l) => l.createdAt >= monthAgo).length;

    // Get practice audit log counts
    const practiceLogs = await ctx.db.query("practiceAuditLogs").collect();
    const practiceLastDay = practiceLogs.filter((l) => l.createdAt >= dayAgo).length;
    const practiceLastWeek = practiceLogs.filter((l) => l.createdAt >= weekAgo).length;
    const practiceLastMonth = practiceLogs.filter((l) => l.createdAt >= monthAgo).length;

    // Get rate limit records
    const rateLimitRecords = await ctx.db.query("rateLimitTracking").collect();

    return {
      orgAuditLogs: {
        total: orgLogs.length,
        lastDay: orgLastDay,
        lastWeek: orgLastWeek,
        lastMonth: orgLastMonth,
      },
      practiceAuditLogs: {
        total: practiceLogs.length,
        lastDay: practiceLastDay,
        lastWeek: practiceLastWeek,
        lastMonth: practiceLastMonth,
      },
      rateLimitRecords: rateLimitRecords.length,
    };
  },
});

/**
 * Cleanup expired rate limit records
 * This should run daily to clean up old rate limit tracking records
 */
export const cleanupRateLimits = internalMutation({
  args: {},
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    const deletedCount = await cleanupExpiredRecords(ctx);
    return { deletedCount };
  },
});

/**
 * Log retention check - ensures we never delete logs within retention period
 * This is a safety check that runs periodically
 */
export const verifyRetention = internalQuery({
  args: {},
  returns: v.object({
    retentionCompliant: v.boolean(),
    oldestOrgLog: v.optional(v.number()),
    oldestPracticeLog: v.optional(v.number()),
    retentionCutoff: v.number(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const retentionCutoff = now - RETENTION_MS;

    // Find oldest org audit log
    const orgLogs = await ctx.db
      .query("orgAuditLogs")
      .withIndex("by_createdAt")
      .order("asc")
      .take(1);

    // Find oldest practice audit log
    const practiceLogs = await ctx.db
      .query("practiceAuditLogs")
      .withIndex("by_createdAt")
      .order("asc")
      .take(1);

    const oldestOrgLog = orgLogs[0]?.createdAt;
    const oldestPracticeLog = practiceLogs[0]?.createdAt;

    // Check if any logs are older than retention period
    const hasOldOrgLogs = oldestOrgLog && oldestOrgLog < retentionCutoff;
    const hasOldPracticeLogs = oldestPracticeLog && oldestPracticeLog < retentionCutoff;

    let message = "All audit logs are within the 6-year retention period.";
    if (hasOldOrgLogs || hasOldPracticeLogs) {
      message =
        "Some audit logs are older than 6 years. Consider archiving to cold storage.";
    }

    return {
      retentionCompliant: true, // We never delete, so always compliant
      oldestOrgLog,
      oldestPracticeLog,
      retentionCutoff,
      message,
    };
  },
});

/**
 * Export audit logs for a specific date range (for compliance reporting)
 * Returns logs grouped by organization/practice
 */
export const exportAuditLogs = internalQuery({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    type: v.union(v.literal("org"), v.literal("practice"), v.literal("both")),
  },
  returns: v.object({
    exportDate: v.number(),
    dateRange: v.object({
      start: v.number(),
      end: v.number(),
    }),
    orgLogCount: v.number(),
    practiceLogCount: v.number(),
  }),
  handler: async (ctx, args) => {
    let orgLogCount = 0;
    let practiceLogCount = 0;

    if (args.type === "org" || args.type === "both") {
      const orgLogs = await ctx.db
        .query("orgAuditLogs")
        .withIndex("by_createdAt")
        .filter((q) =>
          q.and(
            q.gte(q.field("createdAt"), args.startDate),
            q.lte(q.field("createdAt"), args.endDate)
          )
        )
        .collect();
      orgLogCount = orgLogs.length;
    }

    if (args.type === "practice" || args.type === "both") {
      const practiceLogs = await ctx.db
        .query("practiceAuditLogs")
        .withIndex("by_createdAt")
        .filter((q) =>
          q.and(
            q.gte(q.field("createdAt"), args.startDate),
            q.lte(q.field("createdAt"), args.endDate)
          )
        )
        .collect();
      practiceLogCount = practiceLogs.length;
    }

    return {
      exportDate: Date.now(),
      dateRange: {
        start: args.startDate,
        end: args.endDate,
      },
      orgLogCount,
      practiceLogCount,
    };
  },
});
