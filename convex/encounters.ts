/**
 * Encounter management functions
 *
 * Encounters are clinical documentation entries (daily care notes,
 * SOAP notes, initial evaluations, RTP clearances, etc.)
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireAuth,
  requirePermission,
  verifyAthleteInOrg,
  verifyInjuryInOrg,
  verifyEncounterInOrg,
  logAuditEvent,
  now,
} from "./authz";

// Encounter type validator
const encounterTypeValidator = v.union(
  v.literal("daily_care"),
  v.literal("soap_followup"),
  v.literal("initial_eval"),
  v.literal("rtp_clearance"),
  v.literal("rehab_program"),
  v.literal("other")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get encounters for an athlete
 */
export const getByAthlete = query({
  args: {
    athleteId: v.id("athletes"),
    encounterType: v.optional(encounterTypeValidator),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("encounters"),
      encounterType: encounterTypeValidator,
      encounterDatetime: v.number(),
      providerName: v.string(),
      injuryId: v.optional(v.id("injuries")),
      injuryBodyRegion: v.optional(v.string()),
      hasNote: v.boolean(),
      isSignedOff: v.boolean(),
      aiGenerated: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "read");

    await verifyAthleteInOrg(ctx, auth, args.athleteId);

    const encounters = await ctx.db
      .query("encounters")
      .withIndex("by_athleteId", (q) => q.eq("athleteId", args.athleteId))
      .order("desc")
      .collect();

    // Filter and enrich (exclude deleted and archived)
    let filtered = encounters.filter((e) => !e.isDeleted && !e.isArchived);
    if (args.encounterType) {
      filtered = filtered.filter((e) => e.encounterType === args.encounterType);
    }
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    const result = await Promise.all(
      filtered.map(async (enc) => {
        const provider = await ctx.db.get(enc.providerUserId);
        let injuryBodyRegion: string | undefined;
        if (enc.injuryId) {
          const injury = await ctx.db.get(enc.injuryId);
          injuryBodyRegion = injury?.bodyRegion;
        }

        return {
          _id: enc._id,
          encounterType: enc.encounterType,
          encounterDatetime: enc.encounterDatetime,
          providerName: provider?.fullName || "Unknown",
          injuryId: enc.injuryId,
          injuryBodyRegion,
          hasNote: !!(
            enc.subjectiveText ||
            enc.objectiveText ||
            enc.assessmentText ||
            enc.planText ||
            enc.fullNoteText
          ),
          isSignedOff: !!enc.signedOffByUserId,
          aiGenerated: enc.aiGenerated,
          createdAt: enc.createdAt,
        };
      })
    );

    return result;
  },
});

/**
 * Get encounters for an injury
 */
export const getByInjury = query({
  args: { injuryId: v.id("injuries") },
  returns: v.array(
    v.object({
      _id: v.id("encounters"),
      encounterType: encounterTypeValidator,
      encounterDatetime: v.number(),
      providerName: v.string(),
      subjectiveText: v.optional(v.string()),
      objectiveText: v.optional(v.string()),
      assessmentText: v.optional(v.string()),
      planText: v.optional(v.string()),
      isSignedOff: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "read");

    await verifyInjuryInOrg(ctx, auth, args.injuryId);

    const encounters = await ctx.db
      .query("encounters")
      .withIndex("by_injuryId", (q) => q.eq("injuryId", args.injuryId))
      .order("desc")
      .collect();

    const result = await Promise.all(
      encounters
        .filter((e) => !e.isDeleted && !e.isArchived)
        .map(async (enc) => {
          const provider = await ctx.db.get(enc.providerUserId);
          return {
            _id: enc._id,
            encounterType: enc.encounterType,
            encounterDatetime: enc.encounterDatetime,
            providerName: provider?.fullName || "Unknown",
            subjectiveText: enc.subjectiveText,
            objectiveText: enc.objectiveText,
            assessmentText: enc.assessmentText,
            planText: enc.planText,
            isSignedOff: !!enc.signedOffByUserId,
          };
        })
    );

    return result;
  },
});

/**
 * Get a single encounter with full details
 */
export const getById = query({
  args: { encounterId: v.id("encounters") },
  returns: v.union(
    v.object({
      _id: v.id("encounters"),
      athleteId: v.id("athletes"),
      athleteName: v.string(),
      teamName: v.string(),
      injuryId: v.optional(v.id("injuries")),
      injuryBodyRegion: v.optional(v.string()),
      injurySide: v.optional(v.string()),
      encounterType: encounterTypeValidator,
      encounterDatetime: v.number(),
      providerUserId: v.id("users"),
      providerName: v.string(),
      subjectiveText: v.optional(v.string()),
      objectiveText: v.optional(v.string()),
      assessmentText: v.optional(v.string()),
      planText: v.optional(v.string()),
      fullNoteText: v.optional(v.string()),
      transcriptText: v.optional(v.string()),
      aiGenerated: v.boolean(),
      signedOffByUserId: v.optional(v.id("users")),
      signedOffByName: v.optional(v.string()),
      signedOffAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "read");

    const encounter = await verifyEncounterInOrg(ctx, auth, args.encounterId);

    const athlete = await ctx.db.get(encounter.athleteId);
    const team = athlete ? await ctx.db.get(athlete.teamId) : null;
    const provider = await ctx.db.get(encounter.providerUserId);

    let injuryBodyRegion: string | undefined;
    let injurySide: string | undefined;
    if (encounter.injuryId) {
      const injury = await ctx.db.get(encounter.injuryId);
      if (injury) {
        injuryBodyRegion = injury.bodyRegion;
        injurySide = injury.side;
      }
    }

    let signedOffByName: string | undefined;
    if (encounter.signedOffByUserId) {
      const signedOffBy = await ctx.db.get(encounter.signedOffByUserId);
      signedOffByName = signedOffBy?.fullName;
    }

    return {
      _id: encounter._id,
      athleteId: encounter.athleteId,
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Unknown",
      teamName: team?.name || "Unknown Team",
      injuryId: encounter.injuryId,
      injuryBodyRegion,
      injurySide,
      encounterType: encounter.encounterType,
      encounterDatetime: encounter.encounterDatetime,
      providerUserId: encounter.providerUserId,
      providerName: provider?.fullName || "Unknown",
      subjectiveText: encounter.subjectiveText,
      objectiveText: encounter.objectiveText,
      assessmentText: encounter.assessmentText,
      planText: encounter.planText,
      fullNoteText: encounter.fullNoteText,
      transcriptText: encounter.transcriptText,
      aiGenerated: encounter.aiGenerated,
      signedOffByUserId: encounter.signedOffByUserId,
      signedOffByName,
      signedOffAt: encounter.signedOffAt,
      createdAt: encounter.createdAt,
      updatedAt: encounter.updatedAt,
    };
  },
});

/**
 * List recent encounters for the organization (dashboard)
 */
export const listRecent = query({
  args: {
    teamId: v.optional(v.id("teams")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("encounters"),
      athleteId: v.id("athletes"),
      athleteName: v.string(),
      teamName: v.string(),
      encounterType: encounterTypeValidator,
      encounterDatetime: v.number(),
      providerName: v.string(),
      hasNote: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "read");

    const limit = args.limit || 20;

    const encounters = await ctx.db
      .query("encounters")
      .withIndex("by_orgId_and_encounterDatetime", (q) =>
        q.eq("orgId", auth.orgId)
      )
      .order("desc")
      .take(limit * 2); // Get more to account for filtering

    const result = await Promise.all(
      encounters
        .filter((e) => !e.isDeleted)
        .slice(0, limit)
        .map(async (enc) => {
          const athlete = await ctx.db.get(enc.athleteId);
          if (!athlete || athlete.isDeleted) return null;

          const team = await ctx.db.get(athlete.teamId);
          if (!team) return null;

          // Filter by team if specified
          if (args.teamId && team._id !== args.teamId) return null;

          // Check team access for non-admins
          if (auth.role !== "org_admin" && !auth.teamIds.includes(team._id)) {
            return null;
          }

          const provider = await ctx.db.get(enc.providerUserId);

          return {
            _id: enc._id,
            athleteId: enc.athleteId,
            athleteName: `${athlete.firstName} ${athlete.lastName}`,
            teamName: team.name,
            encounterType: enc.encounterType,
            encounterDatetime: enc.encounterDatetime,
            providerName: provider?.fullName || "Unknown",
            hasNote: !!(
              enc.subjectiveText ||
              enc.objectiveText ||
              enc.fullNoteText
            ),
          };
        })
    );

    return result
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .slice(0, limit);
  },
});

/**
 * Get today's encounter count for dashboard
 */
export const getTodayCount = query({
  args: {
    teamId: v.optional(v.id("teams")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const encounters = await ctx.db
      .query("encounters")
      .withIndex("by_orgId_and_encounterDatetime", (q) =>
        q.eq("orgId", auth.orgId).gte("encounterDatetime", todayStart.getTime())
      )
      .collect();

    let filtered = encounters.filter((e) => !e.isDeleted);

    // Filter by team if specified
    const teamIdFilter = args.teamId;
    if (teamIdFilter) {
      const athletes = await ctx.db
        .query("athletes")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamIdFilter))
        .collect();
      const athleteIds = new Set(athletes.map((a) => a._id));
      filtered = filtered.filter((e) => athleteIds.has(e.athleteId));
    }

    return filtered.length;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new encounter
 */
export const create = mutation({
  args: {
    athleteId: v.id("athletes"),
    injuryId: v.optional(v.id("injuries")),
    encounterType: encounterTypeValidator,
    encounterDatetime: v.optional(v.number()),
    subjectiveText: v.optional(v.string()),
    objectiveText: v.optional(v.string()),
    assessmentText: v.optional(v.string()),
    planText: v.optional(v.string()),
    fullNoteText: v.optional(v.string()),
    transcriptText: v.optional(v.string()),
    aiGenerated: v.optional(v.boolean()),
  },
  returns: v.id("encounters"),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "create");

    const athlete = await verifyAthleteInOrg(ctx, auth, args.athleteId);

    // Verify injury if provided
    if (args.injuryId) {
      const injury = await verifyInjuryInOrg(ctx, auth, args.injuryId);
      // Verify injury belongs to this athlete
      if (injury.athleteId !== args.athleteId) {
        throw new Error("Injury does not belong to this athlete");
      }
    }

    const timestamp = now();
    const encounterDatetime = args.encounterDatetime || timestamp;

    const encounterId = await ctx.db.insert("encounters", {
      orgId: auth.orgId,
      athleteId: args.athleteId,
      injuryId: args.injuryId,
      encounterType: args.encounterType,
      encounterDatetime,
      providerUserId: auth.userId,
      subjectiveText: args.subjectiveText,
      objectiveText: args.objectiveText,
      assessmentText: args.assessmentText,
      planText: args.planText,
      fullNoteText: args.fullNoteText,
      transcriptText: args.transcriptText,
      aiGenerated: args.aiGenerated || false,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Log the creation
    await logAuditEvent(ctx, auth, auth.orgId, "create", "encounter", encounterId, {
      athleteName: `${athlete.firstName} ${athlete.lastName}`,
      encounterType: args.encounterType,
      aiGenerated: args.aiGenerated || false,
    });

    return encounterId;
  },
});

/**
 * Update an encounter
 */
export const update = mutation({
  args: {
    encounterId: v.id("encounters"),
    encounterType: v.optional(encounterTypeValidator),
    encounterDatetime: v.optional(v.number()),
    injuryId: v.optional(v.id("injuries")),
    subjectiveText: v.optional(v.string()),
    objectiveText: v.optional(v.string()),
    assessmentText: v.optional(v.string()),
    planText: v.optional(v.string()),
    fullNoteText: v.optional(v.string()),
    transcriptText: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "update");

    const encounter = await verifyEncounterInOrg(ctx, auth, args.encounterId);

    // Can't update signed-off encounters (unless physician)
    if (encounter.signedOffByUserId && auth.role !== "physician") {
      throw new Error("Cannot modify a signed-off encounter");
    }

    // Verify injury if changing
    if (args.injuryId) {
      const injury = await verifyInjuryInOrg(ctx, auth, args.injuryId);
      if (injury.athleteId !== encounter.athleteId) {
        throw new Error("Injury does not belong to this athlete");
      }
    }

    const updates: Record<string, unknown> = {
      updatedAt: now(),
    };

    if (args.encounterType !== undefined) updates.encounterType = args.encounterType;
    if (args.encounterDatetime !== undefined) updates.encounterDatetime = args.encounterDatetime;
    if (args.injuryId !== undefined) updates.injuryId = args.injuryId;
    if (args.subjectiveText !== undefined) updates.subjectiveText = args.subjectiveText;
    if (args.objectiveText !== undefined) updates.objectiveText = args.objectiveText;
    if (args.assessmentText !== undefined) updates.assessmentText = args.assessmentText;
    if (args.planText !== undefined) updates.planText = args.planText;
    if (args.fullNoteText !== undefined) updates.fullNoteText = args.fullNoteText;
    if (args.transcriptText !== undefined) updates.transcriptText = args.transcriptText;

    await ctx.db.patch(args.encounterId, updates);

    // Log the update
    await logAuditEvent(
      ctx,
      auth,
      auth.orgId,
      "update",
      "encounter",
      args.encounterId,
      {
        encounterType: encounter.encounterType,
        updates: Object.keys(updates),
      }
    );

    return true;
  },
});

/**
 * Sign off an encounter (physician approval)
 */
export const signOff = mutation({
  args: { encounterId: v.id("encounters") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    // Only physicians and org admins can sign off
    if (auth.role !== "physician" && auth.role !== "org_admin") {
      throw new Error("Only physicians can sign off on encounters");
    }

    const encounter = await verifyEncounterInOrg(ctx, auth, args.encounterId);

    if (encounter.signedOffByUserId) {
      throw new Error("Encounter has already been signed off");
    }

    const timestamp = now();

    await ctx.db.patch(args.encounterId, {
      signedOffByUserId: auth.userId,
      signedOffAt: timestamp,
      updatedAt: timestamp,
    });

    // Log the sign-off
    await logAuditEvent(ctx, auth, auth.orgId, "sign_off", "encounter", args.encounterId, {
      encounterType: encounter.encounterType,
    });

    return true;
  },
});

/**
 * Remove sign-off (physician only)
 */
export const removeSignOff = mutation({
  args: { encounterId: v.id("encounters") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    if (auth.role !== "physician" && auth.role !== "org_admin") {
      throw new Error("Only physicians can remove sign-off");
    }

    const encounter = await verifyEncounterInOrg(ctx, auth, args.encounterId);

    if (!encounter.signedOffByUserId) {
      throw new Error("Encounter has not been signed off");
    }

    await ctx.db.patch(args.encounterId, {
      signedOffByUserId: undefined,
      signedOffAt: undefined,
      updatedAt: now(),
    });

    // Log the removal
    await logAuditEvent(
      ctx,
      auth,
      auth.orgId,
      "remove_sign_off",
      "encounter",
      args.encounterId
    );

    return true;
  },
});

/**
 * Soft delete an encounter
 */
export const remove = mutation({
  args: { encounterId: v.id("encounters") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "delete");

    const encounter = await verifyEncounterInOrg(ctx, auth, args.encounterId);

    // Can't delete signed-off encounters
    if (encounter.signedOffByUserId) {
      throw new Error("Cannot delete a signed-off encounter");
    }

    const timestamp = now();

    await ctx.db.patch(args.encounterId, {
      isDeleted: true,
      deletedAt: timestamp,
      updatedAt: timestamp,
    });

    // Log the deletion
    await logAuditEvent(ctx, auth, auth.orgId, "delete", "encounter", args.encounterId, {
      encounterType: encounter.encounterType,
    });

    return true;
  },
});

/**
 * Archive an encounter (HIPAA compliant - preserves data but hides from main view)
 */
export const archive = mutation({
  args: { encounterId: v.id("encounters") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "update");

    const encounter = await verifyEncounterInOrg(ctx, auth, args.encounterId);

    const timestamp = now();

    await ctx.db.patch(args.encounterId, {
      isArchived: true,
      archivedAt: timestamp,
      archivedByUserId: auth.userId,
      updatedAt: timestamp,
    });

    // Log the archive action
    await logAuditEvent(ctx, auth, auth.orgId, "archive", "encounter", args.encounterId, {
      encounterType: encounter.encounterType,
    });

    return true;
  },
});

/**
 * Unarchive an encounter (restore from archive)
 */
export const unarchive = mutation({
  args: { encounterId: v.id("encounters") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "update");

    const encounter = await verifyEncounterInOrg(ctx, auth, args.encounterId);

    if (!encounter.isArchived) {
      throw new Error("Encounter is not archived");
    }

    const timestamp = now();

    await ctx.db.patch(args.encounterId, {
      isArchived: false,
      archivedAt: undefined,
      archivedByUserId: undefined,
      updatedAt: timestamp,
    });

    // Log the unarchive action
    await logAuditEvent(ctx, auth, auth.orgId, "unarchive", "encounter", args.encounterId, {
      encounterType: encounter.encounterType,
    });

    return true;
  },
});

/**
 * Get archived encounters for an athlete
 */
export const getArchivedByAthlete = query({
  args: { athleteId: v.id("athletes") },
  returns: v.array(
    v.object({
      _id: v.id("encounters"),
      encounterType: encounterTypeValidator,
      encounterDatetime: v.number(),
      providerName: v.string(),
      injuryBodyRegion: v.optional(v.string()),
      archivedAt: v.optional(v.number()),
      archivedByName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "read");

    await verifyAthleteInOrg(ctx, auth, args.athleteId);

    const encounters = await ctx.db
      .query("encounters")
      .withIndex("by_athleteId", (q) => q.eq("athleteId", args.athleteId))
      .collect();

    // Filter for archived, non-deleted encounters
    const archivedEncounters = encounters.filter(
      (e) => e.isArchived === true && !e.isDeleted
    );

    // Enrich with provider and injury info
    const result = await Promise.all(
      archivedEncounters.map(async (encounter) => {
        const provider = await ctx.db.get(encounter.providerUserId);
        const injury = encounter.injuryId
          ? await ctx.db.get(encounter.injuryId)
          : null;
        const archivedBy = encounter.archivedByUserId
          ? await ctx.db.get(encounter.archivedByUserId)
          : null;

        return {
          _id: encounter._id,
          encounterType: encounter.encounterType,
          encounterDatetime: encounter.encounterDatetime,
          providerName: provider?.fullName || "Unknown",
          injuryBodyRegion: injury?.bodyRegion,
          archivedAt: encounter.archivedAt,
          archivedByName: archivedBy?.fullName,
        };
      })
    );

    // Sort by archived date, most recent first
    return result.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
  },
});

// =============================================================================
// File Upload
// =============================================================================

/**
 * Generate an upload URL for audio recordings
 * Used by the ambient note feature to upload audio files to Convex storage
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    // Require authentication
    await requireAuth(ctx);

    // Generate and return the upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

// =============================================================================
// Constants
// =============================================================================

export const ENCOUNTER_TYPES = [
  { value: "daily_care", label: "Daily Care / Treatment" },
  { value: "soap_followup", label: "SOAP Follow-Up" },
  { value: "initial_eval", label: "Initial Evaluation" },
  { value: "rtp_clearance", label: "Return-to-Play Clearance" },
  { value: "rehab_program", label: "Rehab / Exercise Program" },
  { value: "other", label: "Other" },
] as const;
