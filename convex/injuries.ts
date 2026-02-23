/**
 * Injury management functions
 *
 * Tracks injuries for athletes including body region, diagnosis,
 * and return-to-play status.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireAuth,
  requirePermission,
  verifyAthleteInOrg,
  verifyInjuryInOrg,
  logAuditEvent,
  now,
  type AuthContext,
} from "./authz";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// =============================================================================
// Helper: Update athlete availability based on active injuries
// =============================================================================

/**
 * Recalculates and updates an athlete's availability status based on their active injuries.
 * - If any active injury has rtpStatus "out" → athlete is "out"
 * - Else if any active injury has rtpStatus "limited" → athlete is "limited"
 * - Else → athlete is "healthy"
 */
async function updateAthleteAvailabilityFromInjuries(
  ctx: MutationCtx,
  auth: AuthContext,
  athleteId: Id<"athletes">
): Promise<void> {
  // Get all active injuries for this athlete
  const activeInjuries = await ctx.db
    .query("injuries")
    .withIndex("by_athleteId_and_status", (q) =>
      q.eq("athleteId", athleteId).eq("status", "active")
    )
    .collect();

  const nonDeletedInjuries = activeInjuries.filter((i) => !i.isDeleted);

  // Determine the worst status among all active injuries
  let newStatus: "healthy" | "limited" | "out" = "healthy";

  for (const injury of nonDeletedInjuries) {
    if (injury.rtpStatus === "out") {
      newStatus = "out";
      break; // Can't get worse than "out"
    } else if (injury.rtpStatus === "limited") {
      newStatus = "limited"; // Keep checking for "out"
    }
    // "full" injuries don't affect status - athlete is healthy for that injury
  }

  const timestamp = now();

  // Update the athlete's availability status
  await ctx.db.patch(athleteId, {
    availabilityStatus: newStatus,
    availabilityStatusUpdatedAt: timestamp,
    availabilityStatusUpdatedBy: auth.userId,
    updatedAt: timestamp,
  });
}

// Injury status validator
const injuryStatusValidator = v.union(
  v.literal("active"),
  v.literal("resolved")
);

// Return-to-play status validator
const rtpStatusValidator = v.union(
  v.literal("full"),
  v.literal("limited"),
  v.literal("out")
);

// Body side validator
const sideValidator = v.union(
  v.literal("L"),
  v.literal("R"),
  v.literal("Bilateral"),
  v.literal("NA")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all injuries for an athlete
 */
export const getByAthlete = query({
  args: {
    athleteId: v.id("athletes"),
    status: v.optional(injuryStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("injuries"),
      injuryDate: v.string(),
      bodyRegion: v.string(),
      side: sideValidator,
      mechanism: v.optional(v.string()),
      diagnosis: v.optional(v.string()),
      status: injuryStatusValidator,
      rtpStatus: rtpStatusValidator,
      resolvedDate: v.optional(v.string()),
      createdByName: v.string(),
      encounterCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "injury", "read");

    await verifyAthleteInOrg(ctx, auth, args.athleteId);

    let injuries;
    const statusFilter = args.status;
    if (statusFilter) {
      injuries = await ctx.db
        .query("injuries")
        .withIndex("by_athleteId_and_status", (q) =>
          q.eq("athleteId", args.athleteId).eq("status", statusFilter)
        )
        .collect();
    } else {
      injuries = await ctx.db
        .query("injuries")
        .withIndex("by_athleteId", (q) => q.eq("athleteId", args.athleteId))
        .collect();
    }

    // Enrich with creator name and encounter count
    const result = await Promise.all(
      injuries
        .filter((i) => !i.isDeleted)
        .map(async (injury) => {
          const creator = await ctx.db.get(injury.createdByUserId);

          // Count encounters for this injury
          const encounters = await ctx.db
            .query("encounters")
            .withIndex("by_injuryId", (q) => q.eq("injuryId", injury._id))
            .collect();
          const encounterCount = encounters.filter((e) => !e.isDeleted).length;

          return {
            _id: injury._id,
            injuryDate: injury.injuryDate,
            bodyRegion: injury.bodyRegion,
            side: injury.side,
            mechanism: injury.mechanism,
            diagnosis: injury.diagnosis,
            status: injury.status,
            rtpStatus: injury.rtpStatus,
            resolvedDate: injury.resolvedDate,
            createdByName: creator?.fullName || "Unknown",
            encounterCount,
            createdAt: injury.createdAt,
            updatedAt: injury.updatedAt,
          };
        })
    );

    // Sort by date, most recent first
    return result.sort(
      (a, b) =>
        new Date(b.injuryDate).getTime() - new Date(a.injuryDate).getTime()
    );
  },
});

/**
 * Get a single injury with full details
 */
export const getById = query({
  args: { injuryId: v.id("injuries") },
  returns: v.union(
    v.object({
      _id: v.id("injuries"),
      athleteId: v.id("athletes"),
      athleteName: v.string(),
      teamName: v.string(),
      injuryDate: v.string(),
      bodyRegion: v.string(),
      side: sideValidator,
      mechanism: v.optional(v.string()),
      diagnosis: v.optional(v.string()),
      status: injuryStatusValidator,
      rtpStatus: rtpStatusValidator,
      resolvedDate: v.optional(v.string()),
      createdByName: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "injury", "read");

    const injury = await verifyInjuryInOrg(ctx, auth, args.injuryId);

    const athlete = await ctx.db.get(injury.athleteId);
    const team = athlete ? await ctx.db.get(athlete.teamId) : null;
    const creator = await ctx.db.get(injury.createdByUserId);

    return {
      _id: injury._id,
      athleteId: injury.athleteId,
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Unknown",
      teamName: team?.name || "Unknown Team",
      injuryDate: injury.injuryDate,
      bodyRegion: injury.bodyRegion,
      side: injury.side,
      mechanism: injury.mechanism,
      diagnosis: injury.diagnosis,
      status: injury.status,
      rtpStatus: injury.rtpStatus,
      resolvedDate: injury.resolvedDate,
      createdByName: creator?.fullName || "Unknown",
      createdAt: injury.createdAt,
      updatedAt: injury.updatedAt,
    };
  },
});

/**
 * Get all active injuries for the organization (for injury board)
 */
export const listActive = query({
  args: {
    teamId: v.optional(v.id("teams")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("injuries"),
      athleteId: v.id("athletes"),
      athleteName: v.string(),
      teamId: v.id("teams"),
      teamName: v.string(),
      injuryDate: v.string(),
      bodyRegion: v.string(),
      side: sideValidator,
      diagnosis: v.optional(v.string()),
      rtpStatus: rtpStatusValidator,
      daysSinceInjury: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "injury", "read");

    const injuries = await ctx.db
      .query("injuries")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", auth.orgId).eq("status", "active")
      )
      .collect();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Enrich with athlete and team info
    const result = await Promise.all(
      injuries
        .filter((i) => !i.isDeleted)
        .map(async (injury) => {
          const athlete = await ctx.db.get(injury.athleteId);
          if (!athlete || athlete.isDeleted) return null;

          const team = await ctx.db.get(athlete.teamId);
          if (!team) return null;

          // Filter by team if specified
          if (args.teamId && team._id !== args.teamId) return null;

          // Check team access for non-admins
          if (auth.role !== "org_admin" && !auth.teamIds.includes(team._id)) {
            return null;
          }

          const injuryDate = new Date(injury.injuryDate);
          injuryDate.setHours(0, 0, 0, 0);
          const daysSinceInjury = Math.floor(
            (today.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            _id: injury._id,
            athleteId: injury.athleteId,
            athleteName: `${athlete.firstName} ${athlete.lastName}`,
            teamId: team._id,
            teamName: team.name,
            injuryDate: injury.injuryDate,
            bodyRegion: injury.bodyRegion,
            side: injury.side,
            diagnosis: injury.diagnosis,
            rtpStatus: injury.rtpStatus,
            daysSinceInjury,
          };
        })
    );

    // Filter nulls and sort by RTP status then days since injury
    const filtered = result.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );

    // Sort: out first, then limited, then by days since injury (most recent first)
    const sorted = filtered.sort((a, b) => {
      const rtpOrder = { out: 0, limited: 1, full: 2 };
      const rtpDiff = rtpOrder[a.rtpStatus] - rtpOrder[b.rtpStatus];
      if (rtpDiff !== 0) return rtpDiff;
      return b.daysSinceInjury - a.daysSinceInjury;
    });

    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});

/**
 * Get injury count by status for dashboard
 */
export const getStats = query({
  args: {
    teamId: v.optional(v.id("teams")),
  },
  returns: v.object({
    active: v.number(),
    resolved: v.number(),
    outCount: v.number(),
    limitedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const injuries = await ctx.db
      .query("injuries")
      .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
      .collect();

    let filtered = injuries.filter((i) => !i.isDeleted);

    // Filter by team if specified
    const teamIdFilter = args.teamId;
    if (teamIdFilter) {
      const athletes = await ctx.db
        .query("athletes")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamIdFilter))
        .collect();
      const athleteIds = new Set(athletes.map((a) => a._id));
      filtered = filtered.filter((i) => athleteIds.has(i.athleteId));
    }

    const active = filtered.filter((i) => i.status === "active");

    return {
      active: active.length,
      resolved: filtered.filter((i) => i.status === "resolved").length,
      outCount: active.filter((i) => i.rtpStatus === "out").length,
      limitedCount: active.filter((i) => i.rtpStatus === "limited").length,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new injury
 */
export const create = mutation({
  args: {
    athleteId: v.id("athletes"),
    injuryDate: v.string(),
    bodyRegion: v.string(),
    side: sideValidator,
    mechanism: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    rtpStatus: rtpStatusValidator,
  },
  returns: v.id("injuries"),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "injury", "create");

    const athlete = await verifyAthleteInOrg(ctx, auth, args.athleteId);

    const timestamp = now();

    const injuryId = await ctx.db.insert("injuries", {
      orgId: auth.orgId,
      athleteId: args.athleteId,
      injuryDate: args.injuryDate,
      bodyRegion: args.bodyRegion,
      side: args.side,
      mechanism: args.mechanism,
      diagnosis: args.diagnosis,
      status: "active",
      rtpStatus: args.rtpStatus,
      createdByUserId: auth.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Log the creation
    await logAuditEvent(ctx, auth, auth.orgId, "create", "injury", injuryId, {
      athleteName: `${athlete.firstName} ${athlete.lastName}`,
      bodyRegion: args.bodyRegion,
      side: args.side,
    });

    // Update athlete's availability status based on this new injury
    await updateAthleteAvailabilityFromInjuries(ctx, auth, args.athleteId);

    return injuryId;
  },
});

/**
 * Update an injury
 */
export const update = mutation({
  args: {
    injuryId: v.id("injuries"),
    injuryDate: v.optional(v.string()),
    bodyRegion: v.optional(v.string()),
    side: v.optional(sideValidator),
    mechanism: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    rtpStatus: v.optional(rtpStatusValidator),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "injury", "update");

    const injury = await verifyInjuryInOrg(ctx, auth, args.injuryId);
    const athlete = await ctx.db.get(injury.athleteId);

    const updates: Record<string, unknown> = {
      updatedAt: now(),
    };

    if (args.injuryDate !== undefined) updates.injuryDate = args.injuryDate;
    if (args.bodyRegion !== undefined) updates.bodyRegion = args.bodyRegion;
    if (args.side !== undefined) updates.side = args.side;
    if (args.mechanism !== undefined) updates.mechanism = args.mechanism;
    if (args.diagnosis !== undefined) updates.diagnosis = args.diagnosis;
    if (args.rtpStatus !== undefined) updates.rtpStatus = args.rtpStatus;

    await ctx.db.patch(args.injuryId, updates);

    // Log the update
    await logAuditEvent(ctx, auth, auth.orgId, "update", "injury", args.injuryId, {
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Unknown",
      bodyRegion: injury.bodyRegion,
      updates: Object.keys(updates),
    });

    // If rtpStatus changed, update athlete's availability
    if (args.rtpStatus !== undefined) {
      await updateAthleteAvailabilityFromInjuries(ctx, auth, injury.athleteId);
    }

    return true;
  },
});

/**
 * Resolve an injury (mark as healed)
 */
export const resolve = mutation({
  args: {
    injuryId: v.id("injuries"),
    resolvedDate: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "injury", "update");

    const injury = await verifyInjuryInOrg(ctx, auth, args.injuryId);
    const athlete = await ctx.db.get(injury.athleteId);

    const resolvedDate =
      args.resolvedDate || new Date().toISOString().split("T")[0];

    await ctx.db.patch(args.injuryId, {
      status: "resolved",
      rtpStatus: "full",
      resolvedDate,
      updatedAt: now(),
    });

    // Log the resolution
    await logAuditEvent(ctx, auth, auth.orgId, "resolve", "injury", args.injuryId, {
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Unknown",
      bodyRegion: injury.bodyRegion,
      resolvedDate,
    });

    // Recalculate athlete's availability status after resolving injury
    await updateAthleteAvailabilityFromInjuries(ctx, auth, injury.athleteId);

    return true;
  },
});

/**
 * Reopen a resolved injury
 */
export const reopen = mutation({
  args: {
    injuryId: v.id("injuries"),
    rtpStatus: rtpStatusValidator,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "injury", "update");

    const injury = await verifyInjuryInOrg(ctx, auth, args.injuryId);

    if (injury.status !== "resolved") {
      throw new Error("Injury is not resolved");
    }

    const athlete = await ctx.db.get(injury.athleteId);

    await ctx.db.patch(args.injuryId, {
      status: "active",
      rtpStatus: args.rtpStatus,
      resolvedDate: undefined,
      updatedAt: now(),
    });

    // Log the reopen
    await logAuditEvent(ctx, auth, auth.orgId, "reopen", "injury", args.injuryId, {
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Unknown",
      bodyRegion: injury.bodyRegion,
    });

    // Recalculate athlete's availability status after reopening injury
    await updateAthleteAvailabilityFromInjuries(ctx, auth, injury.athleteId);

    return true;
  },
});

/**
 * Soft delete an injury
 */
export const remove = mutation({
  args: { injuryId: v.id("injuries") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "injury", "delete");

    const injury = await verifyInjuryInOrg(ctx, auth, args.injuryId);
    const athlete = await ctx.db.get(injury.athleteId);

    const timestamp = now();

    await ctx.db.patch(args.injuryId, {
      isDeleted: true,
      deletedAt: timestamp,
      updatedAt: timestamp,
    });

    // Log the deletion
    await logAuditEvent(ctx, auth, auth.orgId, "delete", "injury", args.injuryId, {
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Unknown",
      bodyRegion: injury.bodyRegion,
    });

    // Recalculate athlete's availability status after deleting injury
    await updateAthleteAvailabilityFromInjuries(ctx, auth, injury.athleteId);

    return true;
  },
});

// =============================================================================
// Constants for dropdowns
// =============================================================================

export const BODY_REGIONS = [
  { value: "head", label: "Head" },
  { value: "face", label: "Face" },
  { value: "neck", label: "Neck" },
  { value: "shoulder", label: "Shoulder" },
  { value: "upper_arm", label: "Upper Arm" },
  { value: "elbow", label: "Elbow" },
  { value: "forearm", label: "Forearm" },
  { value: "wrist", label: "Wrist" },
  { value: "hand", label: "Hand / Fingers" },
  { value: "chest", label: "Chest" },
  { value: "upper_back", label: "Upper Back" },
  { value: "lower_back", label: "Lower Back" },
  { value: "abdomen", label: "Abdomen" },
  { value: "hip", label: "Hip / Groin" },
  { value: "thigh", label: "Thigh" },
  { value: "knee", label: "Knee" },
  { value: "lower_leg", label: "Lower Leg" },
  { value: "ankle", label: "Ankle" },
  { value: "foot", label: "Foot / Toes" },
  { value: "other", label: "Other" },
] as const;

export const SIDE_OPTIONS = [
  { value: "L", label: "Left" },
  { value: "R", label: "Right" },
  { value: "Bilateral", label: "Bilateral" },
  { value: "NA", label: "N/A" },
] as const;

export const RTP_STATUS_OPTIONS = [
  { value: "full", label: "Full Participation" },
  { value: "limited", label: "Limited Participation" },
  { value: "out", label: "Out / No Participation" },
] as const;
