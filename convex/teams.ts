/**
 * Team management functions
 *
 * Teams belong to organizations and group athletes together.
 * Athletic trainers are assigned to specific teams.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireAuth,
  requireOrgAdmin,
  hasTeamAccess,
  verifyTeamInOrg,
  logAuditEvent,
  generateInviteCode,
  now,
} from "./authz";

// =============================================================================
// Queries
// =============================================================================

/**
 * List all teams for the current organization
 */
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("teams"),
      _creationTime: v.number(),
      orgId: v.id("organizations"),
      name: v.string(),
      sport: v.string(),
      season: v.optional(v.string()),
      inviteCode: v.string(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
      .collect();

    // Filter by active status unless includeInactive is true
    let filteredTeams = teams;
    if (!args.includeInactive) {
      filteredTeams = teams.filter((t) => t.isActive);
    }

    // Org admins and ATs see all teams in the org
    // Other roles only see teams they have access to
    if (auth.role !== "org_admin" && auth.role !== "athletic_trainer") {
      filteredTeams = filteredTeams.filter((t) =>
        hasTeamAccess(auth, t._id)
      );
    }

    return filteredTeams;
  },
});

/**
 * Get a single team by ID
 */
export const getById = query({
  args: { teamId: v.id("teams") },
  returns: v.union(
    v.object({
      _id: v.id("teams"),
      _creationTime: v.number(),
      orgId: v.id("organizations"),
      name: v.string(),
      sport: v.string(),
      season: v.optional(v.string()),
      inviteCode: v.string(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    // Verify team belongs to user's org
    if (team.orgId !== auth.orgId) return null;

    // Check team access for non-admins and non-ATs
    if (auth.role !== "org_admin" && auth.role !== "athletic_trainer" && !hasTeamAccess(auth, team._id)) {
      return null;
    }

    return team;
  },
});

/**
 * Get team by invite code (for athlete self-registration)
 * This doesn't require authentication
 */
export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("teams"),
      name: v.string(),
      sport: v.string(),
      orgName: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!team || !team.isActive) return null;

    // Get org name
    const org = await ctx.db.get(team.orgId);
    if (!org || org.isDeleted) return null;

    return {
      _id: team._id,
      name: team.name,
      sport: team.sport,
      orgName: org.name,
    };
  },
});

/**
 * Get team statistics
 */
export const getStats = query({
  args: { teamId: v.id("teams") },
  returns: v.union(
    v.object({
      athleteCount: v.number(),
      activeInjuryCount: v.number(),
      athleticTrainerCount: v.number(),
      todayEncounterCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const team = await verifyTeamInOrg(ctx, auth, args.teamId);
    if (!team) return null;

    // Count athletes on this team
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    const athleteCount = athletes.filter((a) => a.isActive && !a.isDeleted)
      .length;

    // Count active injuries for athletes on this team
    let activeInjuryCount = 0;
    for (const athlete of athletes.filter((a) => a.isActive && !a.isDeleted)) {
      const injuries = await ctx.db
        .query("injuries")
        .withIndex("by_athleteId_and_status", (q) =>
          q.eq("athleteId", athlete._id).eq("status", "active")
        )
        .collect();
      activeInjuryCount += injuries.filter((i) => !i.isDeleted).length;
    }

    // Count ATs assigned to this team
    const users = await ctx.db
      .query("users")
      .withIndex("by_orgId_and_role", (q) =>
        q.eq("orgId", auth.orgId).eq("role", "athletic_trainer")
      )
      .collect();
    const athleticTrainerCount = users.filter(
      (u) => u.isActive && !u.isDeleted && u.teamIds.includes(args.teamId)
    ).length;

    // Count today's encounters for athletes on this team
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let todayEncounterCount = 0;
    for (const athlete of athletes.filter((a) => a.isActive && !a.isDeleted)) {
      const encounters = await ctx.db
        .query("encounters")
        .withIndex("by_athleteId", (q) => q.eq("athleteId", athlete._id))
        .collect();
      todayEncounterCount += encounters.filter(
        (e) => !e.isDeleted && e.encounterDatetime >= todayStart.getTime()
      ).length;
    }

    return {
      athleteCount,
      activeInjuryCount,
      athleticTrainerCount,
      todayEncounterCount,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new team (org admin only)
 */
export const create = mutation({
  args: {
    name: v.string(),
    sport: v.string(),
    season: v.optional(v.string()),
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    // Check if org has reached team limit
    const org = await ctx.db.get(auth.orgId);
    if (!org || org.isDeleted) {
      throw new Error("Organization not found");
    }

    const existingTeams = await ctx.db
      .query("teams")
      .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
      .collect();
    const activeTeamCount = existingTeams.filter((t) => t.isActive).length;

    if (activeTeamCount >= org.teamCount) {
      throw new Error(
        `Team limit reached. Your plan allows ${org.teamCount} teams.`
      );
    }

    const timestamp = now();
    const inviteCode = generateInviteCode();

    const teamId = await ctx.db.insert("teams", {
      orgId: auth.orgId,
      name: args.name,
      sport: args.sport,
      season: args.season,
      inviteCode,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Log the creation
    await logAuditEvent(ctx, auth, auth.orgId, "create", "team", teamId, {
      name: args.name,
      sport: args.sport,
    });

    return teamId;
  },
});

/**
 * Update a team (org admin only)
 */
export const update = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    sport: v.optional(v.string()),
    season: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const team = await verifyTeamInOrg(ctx, auth, args.teamId);

    const updates: Partial<{
      name: string;
      sport: string;
      season: string;
      isActive: boolean;
      updatedAt: number;
    }> = {
      updatedAt: now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.sport !== undefined) updates.sport = args.sport;
    if (args.season !== undefined) updates.season = args.season;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.teamId, updates);

    // Log the update
    await logAuditEvent(ctx, auth, auth.orgId, "update", "team", args.teamId, {
      teamName: team.name,
      updates: Object.keys(updates),
    });

    return true;
  },
});

/**
 * Regenerate invite code (org admin only)
 * Use this if the invite code is compromised
 */
export const regenerateInviteCode = mutation({
  args: { teamId: v.id("teams") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const team = await verifyTeamInOrg(ctx, auth, args.teamId);

    const newInviteCode = generateInviteCode();

    await ctx.db.patch(args.teamId, {
      inviteCode: newInviteCode,
      updatedAt: now(),
    });

    // Log the action
    await logAuditEvent(
      ctx,
      auth,
      auth.orgId,
      "update",
      "team_invite_code",
      args.teamId,
      {
        teamName: team.name,
        reason: "regenerated",
      }
    );

    return newInviteCode;
  },
});

/**
 * Delete a team (org admin only)
 * This is a soft delete that deactivates the team
 */
export const remove = mutation({
  args: { teamId: v.id("teams") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const team = await verifyTeamInOrg(ctx, auth, args.teamId);

    await ctx.db.patch(args.teamId, {
      isActive: false,
      updatedAt: now(),
    });

    // Log the deletion
    await logAuditEvent(ctx, auth, auth.orgId, "delete", "team", args.teamId, {
      teamName: team.name,
    });

    return true;
  },
});

// =============================================================================
// Sport Options (for dropdowns)
// =============================================================================

export const SPORTS = [
  { value: "baseball", label: "Baseball" },
  { value: "basketball", label: "Basketball" },
  { value: "cross_country", label: "Cross Country" },
  { value: "field_hockey", label: "Field Hockey" },
  { value: "football", label: "Football" },
  { value: "golf", label: "Golf" },
  { value: "gymnastics", label: "Gymnastics" },
  { value: "ice_hockey", label: "Ice Hockey" },
  { value: "lacrosse", label: "Lacrosse" },
  { value: "rowing", label: "Rowing" },
  { value: "rugby", label: "Rugby" },
  { value: "skiing", label: "Skiing" },
  { value: "soccer", label: "Soccer" },
  { value: "softball", label: "Softball" },
  { value: "swimming", label: "Swimming & Diving" },
  { value: "tennis", label: "Tennis" },
  { value: "track_field", label: "Track & Field" },
  { value: "volleyball", label: "Volleyball" },
  { value: "water_polo", label: "Water Polo" },
  { value: "wrestling", label: "Wrestling" },
  { value: "other", label: "Other" },
] as const;

export const SEASONS = [
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
  { value: "spring", label: "Spring" },
  { value: "year_round", label: "Year-Round" },
] as const;
