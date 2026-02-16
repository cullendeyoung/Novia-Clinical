/**
 * Athlete management functions
 *
 * Athletes are the patients in the athletic training context.
 * They belong to teams and organizations.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireAuth,
  requirePermission,
  hasTeamAccess,
  verifyTeamInOrg,
  verifyAthleteInOrg,
  logAuditEvent,
  now,
} from "./authz";

// Sex validator
const sexValidator = v.union(
  v.literal("M"),
  v.literal("F"),
  v.literal("Other")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List athletes for a team
 */
export const listByTeam = query({
  args: {
    teamId: v.id("teams"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("athletes"),
      firstName: v.string(),
      lastName: v.string(),
      jerseyNumber: v.optional(v.string()),
      position: v.optional(v.string()),
      classYear: v.optional(v.string()),
      isActive: v.boolean(),
      activeInjuryCount: v.number(),
      lastEncounterDate: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "read");

    // Verify team access
    await verifyTeamInOrg(ctx, auth, args.teamId);
    if (auth.role !== "org_admin" && !hasTeamAccess(auth, args.teamId)) {
      throw new Error("Access denied: You do not have access to this team");
    }

    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Filter and enrich
    const result = await Promise.all(
      athletes
        .filter((a) => {
          if (a.isDeleted) return false;
          if (!args.includeInactive && !a.isActive) return false;
          return true;
        })
        .map(async (a) => {
          // Count active injuries
          const injuries = await ctx.db
            .query("injuries")
            .withIndex("by_athleteId_and_status", (q) =>
              q.eq("athleteId", a._id).eq("status", "active")
            )
            .collect();
          const activeInjuryCount = injuries.filter((i) => !i.isDeleted).length;

          // Get last encounter date
          const encounters = await ctx.db
            .query("encounters")
            .withIndex("by_athleteId", (q) => q.eq("athleteId", a._id))
            .order("desc")
            .take(1);
          const lastEncounter = encounters[0];

          return {
            _id: a._id,
            firstName: a.firstName,
            lastName: a.lastName,
            jerseyNumber: a.jerseyNumber,
            position: a.position,
            classYear: a.classYear,
            isActive: a.isActive,
            activeInjuryCount,
            lastEncounterDate: lastEncounter?.isDeleted
              ? undefined
              : lastEncounter?.encounterDatetime,
          };
        })
    );

    // Sort by last name
    return result.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

/**
 * Get a single athlete with full details
 */
export const getById = query({
  args: { athleteId: v.id("athletes") },
  returns: v.union(
    v.object({
      _id: v.id("athletes"),
      _creationTime: v.number(),
      orgId: v.id("organizations"),
      teamId: v.id("teams"),
      teamName: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      dateOfBirth: v.optional(v.string()),
      sex: v.optional(sexValidator),
      classYear: v.optional(v.string()),
      jerseyNumber: v.optional(v.string()),
      position: v.optional(v.string()),
      heightInches: v.optional(v.number()),
      weightLbs: v.optional(v.number()),
      notes: v.optional(v.string()),
      emergencyContactName: v.optional(v.string()),
      emergencyContactPhone: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "read");

    const athlete = await verifyAthleteInOrg(ctx, auth, args.athleteId);

    const team = await ctx.db.get(athlete.teamId);

    return {
      _id: athlete._id,
      _creationTime: athlete._creationTime,
      orgId: athlete.orgId,
      teamId: athlete.teamId,
      teamName: team?.name || "Unknown Team",
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      dateOfBirth: athlete.dateOfBirth,
      sex: athlete.sex,
      classYear: athlete.classYear,
      jerseyNumber: athlete.jerseyNumber,
      position: athlete.position,
      heightInches: athlete.heightInches,
      weightLbs: athlete.weightLbs,
      notes: athlete.notes,
      emergencyContactName: athlete.emergencyContactName,
      emergencyContactPhone: athlete.emergencyContactPhone,
      isActive: athlete.isActive,
      createdAt: athlete.createdAt,
      updatedAt: athlete.updatedAt,
    };
  },
});

/**
 * Search athletes by name
 */
export const search = query({
  args: {
    query: v.string(),
    teamId: v.optional(v.id("teams")),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("athletes"),
      firstName: v.string(),
      lastName: v.string(),
      jerseyNumber: v.optional(v.string()),
      teamId: v.id("teams"),
      teamName: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "read");

    const searchTerm = args.query.toLowerCase().trim();
    const limit = args.limit || 20;

    // Get all athletes for the org
    let athletes;
    const teamIdFilter = args.teamId;
    if (teamIdFilter) {
      await verifyTeamInOrg(ctx, auth, teamIdFilter);
      athletes = await ctx.db
        .query("athletes")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamIdFilter))
        .collect();
    } else {
      athletes = await ctx.db
        .query("athletes")
        .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
        .collect();
    }

    // Filter by search term and team access
    const filtered = athletes.filter((a) => {
      if (a.isDeleted || !a.isActive) return false;
      if (auth.role !== "org_admin" && !hasTeamAccess(auth, a.teamId)) return false;

      const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
      const reverseName = `${a.lastName} ${a.firstName}`.toLowerCase();
      return (
        fullName.includes(searchTerm) ||
        reverseName.includes(searchTerm) ||
        (a.jerseyNumber && a.jerseyNumber.includes(searchTerm))
      );
    });

    // Get team names
    const result = await Promise.all(
      filtered.slice(0, limit).map(async (a) => {
        const team = await ctx.db.get(a.teamId);
        return {
          _id: a._id,
          firstName: a.firstName,
          lastName: a.lastName,
          jerseyNumber: a.jerseyNumber,
          teamId: a.teamId,
          teamName: team?.name || "Unknown Team",
        };
      })
    );

    return result;
  },
});

/**
 * Get athlete count for organization dashboard
 */
export const getCount = query({
  args: {
    teamId: v.optional(v.id("teams")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    let athletes;
    const teamIdFilter = args.teamId;
    if (teamIdFilter) {
      await verifyTeamInOrg(ctx, auth, teamIdFilter);
      athletes = await ctx.db
        .query("athletes")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamIdFilter))
        .collect();
    } else {
      athletes = await ctx.db
        .query("athletes")
        .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
        .collect();
    }

    return athletes.filter((a) => a.isActive && !a.isDeleted).length;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new athlete (AT adds to roster)
 */
export const create = mutation({
  args: {
    teamId: v.id("teams"),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
    sex: v.optional(sexValidator),
    classYear: v.optional(v.string()),
    jerseyNumber: v.optional(v.string()),
    position: v.optional(v.string()),
    heightInches: v.optional(v.number()),
    weightLbs: v.optional(v.number()),
    notes: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  },
  returns: v.id("athletes"),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "create");

    // Verify team access
    await verifyTeamInOrg(ctx, auth, args.teamId);
    if (auth.role !== "org_admin" && !hasTeamAccess(auth, args.teamId)) {
      throw new Error("Access denied: You do not have access to this team");
    }

    const timestamp = now();

    const athleteId = await ctx.db.insert("athletes", {
      orgId: auth.orgId,
      teamId: args.teamId,
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      sex: args.sex,
      classYear: args.classYear,
      jerseyNumber: args.jerseyNumber,
      position: args.position,
      heightInches: args.heightInches,
      weightLbs: args.weightLbs,
      notes: args.notes,
      emergencyContactName: args.emergencyContactName,
      emergencyContactPhone: args.emergencyContactPhone,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Log the creation
    await logAuditEvent(ctx, auth, auth.orgId, "create", "athlete", athleteId, {
      name: `${args.firstName} ${args.lastName}`,
      teamId: args.teamId,
    });

    return athleteId;
  },
});

/**
 * Self-register as an athlete (via team invite code)
 */
export const selfRegister = mutation({
  args: {
    inviteCode: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    dateOfBirth: v.optional(v.string()),
    sex: v.optional(sexValidator),
    classYear: v.optional(v.string()),
    jerseyNumber: v.optional(v.string()),
    position: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    athleteId: v.optional(v.id("athletes")),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Find team by invite code
    const team = await ctx.db
      .query("teams")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!team || !team.isActive) {
      return { success: false, message: "Invalid invite code" };
    }

    // Check org is active
    const org = await ctx.db.get(team.orgId);
    if (!org || org.isDeleted || org.status === "canceled") {
      return { success: false, message: "Organization is not active" };
    }

    // Check if athlete already exists with this email
    const existingAthletes = await ctx.db
      .query("athletes")
      .withIndex("by_orgId_and_teamId", (q) =>
        q.eq("orgId", team.orgId).eq("teamId", team._id)
      )
      .collect();

    // Note: Athletes don't have email in schema currently
    // For now, check by name to prevent duplicates
    const duplicate = existingAthletes.find(
      (a) =>
        !a.isDeleted &&
        a.firstName.toLowerCase() === args.firstName.toLowerCase() &&
        a.lastName.toLowerCase() === args.lastName.toLowerCase()
    );

    if (duplicate) {
      return {
        success: false,
        message: "An athlete with this name already exists on the team",
      };
    }

    const timestamp = now();

    const athleteId = await ctx.db.insert("athletes", {
      orgId: team.orgId,
      teamId: team._id,
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      sex: args.sex,
      classYear: args.classYear,
      jerseyNumber: args.jerseyNumber,
      position: args.position,
      emergencyContactName: args.emergencyContactName,
      emergencyContactPhone: args.emergencyContactPhone,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Log the self-registration
    await ctx.db.insert("orgAuditLogs", {
      orgId: team.orgId,
      action: "self_register",
      entityType: "athlete",
      entityId: athleteId,
      metadataJson: JSON.stringify({
        name: `${args.firstName} ${args.lastName}`,
        email: args.email,
        teamId: team._id,
        teamName: team.name,
      }),
      createdAt: timestamp,
    });

    return {
      success: true,
      athleteId,
      message: "Registration successful!",
    };
  },
});

/**
 * Update an athlete
 */
export const update = mutation({
  args: {
    athleteId: v.id("athletes"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    sex: v.optional(sexValidator),
    classYear: v.optional(v.string()),
    jerseyNumber: v.optional(v.string()),
    position: v.optional(v.string()),
    heightInches: v.optional(v.number()),
    weightLbs: v.optional(v.number()),
    notes: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "update");

    const athlete = await verifyAthleteInOrg(ctx, auth, args.athleteId);

    const updates: Record<string, unknown> = {
      updatedAt: now(),
    };

    // Only include fields that were provided
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.sex !== undefined) updates.sex = args.sex;
    if (args.classYear !== undefined) updates.classYear = args.classYear;
    if (args.jerseyNumber !== undefined) updates.jerseyNumber = args.jerseyNumber;
    if (args.position !== undefined) updates.position = args.position;
    if (args.heightInches !== undefined) updates.heightInches = args.heightInches;
    if (args.weightLbs !== undefined) updates.weightLbs = args.weightLbs;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.emergencyContactName !== undefined) updates.emergencyContactName = args.emergencyContactName;
    if (args.emergencyContactPhone !== undefined) updates.emergencyContactPhone = args.emergencyContactPhone;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.athleteId, updates);

    // Log the update
    await logAuditEvent(ctx, auth, auth.orgId, "update", "athlete", args.athleteId, {
      name: `${athlete.firstName} ${athlete.lastName}`,
      updates: Object.keys(updates),
    });

    return true;
  },
});

/**
 * Transfer an athlete to a different team (org admin only)
 */
export const transferTeam = mutation({
  args: {
    athleteId: v.id("athletes"),
    newTeamId: v.id("teams"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    // Only org admin can transfer between teams
    if (auth.role !== "org_admin") {
      throw new Error("Only organization administrators can transfer athletes");
    }

    const athlete = await verifyAthleteInOrg(ctx, auth, args.athleteId);
    const newTeam = await verifyTeamInOrg(ctx, auth, args.newTeamId);

    const oldTeam = await ctx.db.get(athlete.teamId);

    await ctx.db.patch(args.athleteId, {
      teamId: args.newTeamId,
      updatedAt: now(),
    });

    // Log the transfer
    await logAuditEvent(ctx, auth, auth.orgId, "transfer", "athlete", args.athleteId, {
      name: `${athlete.firstName} ${athlete.lastName}`,
      fromTeam: oldTeam?.name,
      toTeam: newTeam.name,
    });

    return true;
  },
});

/**
 * Soft delete an athlete
 */
export const remove = mutation({
  args: { athleteId: v.id("athletes") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "delete");

    const athlete = await verifyAthleteInOrg(ctx, auth, args.athleteId);

    const timestamp = now();

    await ctx.db.patch(args.athleteId, {
      isDeleted: true,
      deletedAt: timestamp,
      isActive: false,
      updatedAt: timestamp,
    });

    // Log the deletion
    await logAuditEvent(ctx, auth, auth.orgId, "delete", "athlete", args.athleteId, {
      name: `${athlete.firstName} ${athlete.lastName}`,
    });

    return true;
  },
});

// =============================================================================
// Constants for dropdowns
// =============================================================================

export const CLASS_YEARS = [
  { value: "Freshman", label: "Freshman" },
  { value: "Sophomore", label: "Sophomore" },
  { value: "Junior", label: "Junior" },
  { value: "Senior", label: "Senior" },
  { value: "Graduate", label: "Graduate" },
  { value: "5th Year", label: "5th Year" },
  { value: "Redshirt Freshman", label: "Redshirt Freshman" },
  { value: "Redshirt Sophomore", label: "Redshirt Sophomore" },
  { value: "Redshirt Junior", label: "Redshirt Junior" },
  { value: "Redshirt Senior", label: "Redshirt Senior" },
] as const;

export const SEX_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "Other", label: "Other" },
] as const;
