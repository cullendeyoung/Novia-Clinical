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

/**
 * Get detailed team statistics for management page
 */
export const getDetailedStats = query({
  args: { teamId: v.id("teams") },
  returns: v.union(
    v.object({
      // Athlete counts
      totalAthletes: v.number(),
      activeAthletes: v.number(),
      // Injury breakdown
      athletesWithActiveInjuries: v.number(),
      totalActiveInjuries: v.number(),
      // RTP Status breakdown
      athletesFull: v.number(),
      athletesLimited: v.number(),
      athletesOut: v.number(),
      // Recent injuries (last 7 days)
      recentInjuries: v.array(
        v.object({
          athleteId: v.id("athletes"),
          athleteName: v.string(),
          bodyRegion: v.string(),
          side: v.string(),
          injuryDate: v.string(),
          status: v.string(),
          rtpStatus: v.string(),
        })
      ),
      // Today's encounters
      todayEncounters: v.number(),
      // AT count
      athleticTrainers: v.array(
        v.object({
          _id: v.id("users"),
          fullName: v.string(),
          email: v.string(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const team = await verifyTeamInOrg(ctx, auth, args.teamId);
    if (!team) return null;

    // Get all athletes on this team
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activeAthletes = athletes.filter((a) => a.isActive && !a.isDeleted);
    const totalAthletes = athletes.filter((a) => !a.isDeleted).length;

    // Get injuries and RTP status
    let athletesWithActiveInjuries = 0;
    let totalActiveInjuries = 0;
    let athletesFull = 0;
    let athletesLimited = 0;
    let athletesOut = 0;
    const recentInjuries: {
      athleteId: typeof args.teamId extends never ? never : (typeof athletes)[0]["_id"];
      athleteName: string;
      bodyRegion: string;
      side: string;
      injuryDate: string;
      status: string;
      rtpStatus: string;
    }[] = [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    for (const athlete of activeAthletes) {
      const injuries = await ctx.db
        .query("injuries")
        .withIndex("by_athleteId_and_status", (q) =>
          q.eq("athleteId", athlete._id).eq("status", "active")
        )
        .collect();

      const activeInjuries = injuries.filter((i) => !i.isDeleted);

      if (activeInjuries.length > 0) {
        athletesWithActiveInjuries++;
        totalActiveInjuries += activeInjuries.length;

        // Check RTP status from most recent injury
        const mostRecent = activeInjuries.sort((a, b) =>
          b.injuryDate.localeCompare(a.injuryDate)
        )[0];

        if (mostRecent.rtpStatus === "out") {
          athletesOut++;
        } else if (mostRecent.rtpStatus === "limited") {
          athletesLimited++;
        } else {
          athletesFull++;
        }

        // Add recent injuries to list
        for (const injury of activeInjuries) {
          if (injury.injuryDate >= sevenDaysAgoStr) {
            recentInjuries.push({
              athleteId: athlete._id,
              athleteName: `${athlete.firstName} ${athlete.lastName}`,
              bodyRegion: injury.bodyRegion,
              side: injury.side,
              injuryDate: injury.injuryDate,
              status: injury.status,
              rtpStatus: injury.rtpStatus,
            });
          }
        }
      } else {
        athletesFull++;
      }
    }

    // Sort recent injuries by date descending
    recentInjuries.sort((a, b) => b.injuryDate.localeCompare(a.injuryDate));

    // Count today's encounters
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let todayEncounters = 0;

    for (const athlete of activeAthletes) {
      const encounters = await ctx.db
        .query("encounters")
        .withIndex("by_athleteId", (q) => q.eq("athleteId", athlete._id))
        .collect();
      todayEncounters += encounters.filter(
        (e) => !e.isDeleted && e.encounterDatetime >= todayStart.getTime()
      ).length;
    }

    // Get ATs assigned to this team
    const users = await ctx.db
      .query("users")
      .withIndex("by_orgId_and_role", (q) =>
        q.eq("orgId", auth.orgId).eq("role", "athletic_trainer")
      )
      .collect();

    const athleticTrainers = users
      .filter(
        (u) =>
          u.isActive &&
          !u.isDeleted &&
          (u.teamIds.includes(args.teamId) || u.fullTimeTeamId === args.teamId)
      )
      .map((u) => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
      }));

    return {
      totalAthletes,
      activeAthletes: activeAthletes.length,
      athletesWithActiveInjuries,
      totalActiveInjuries,
      athletesFull,
      athletesLimited,
      athletesOut,
      recentInjuries: recentInjuries.slice(0, 10), // Limit to 10 most recent
      todayEncounters,
      athleticTrainers,
    };
  },
});

/**
 * Get season overview stats for a team
 * Shows historical data organized by academic year (e.g., "24-25", "25-26")
 */
export const getSeasonOverview = query({
  args: {
    teamId: v.id("teams"),
    seasonYear: v.optional(v.string()), // e.g., "24-25" - if not provided, returns current season
  },
  returns: v.union(
    v.object({
      seasonYear: v.string(),
      seasonLabel: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      // Injury stats
      totalInjuries: v.number(),
      resolvedInjuries: v.number(),
      activeInjuries: v.number(),
      avgRecoveryDays: v.optional(v.number()),
      // Injury breakdown by body region
      injuriesByRegion: v.array(
        v.object({
          region: v.string(),
          count: v.number(),
        })
      ),
      // Encounter stats
      totalEncounters: v.number(),
      encountersByType: v.array(
        v.object({
          type: v.string(),
          count: v.number(),
        })
      ),
      // Athlete stats
      totalAthletes: v.number(),
      athletesWithInjuries: v.number(),
      // Time lost
      totalDaysLimited: v.number(),
      totalDaysOut: v.number(),
      // Available seasons for dropdown
      availableSeasons: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const team = await verifyTeamInOrg(ctx, auth, args.teamId);
    if (!team) return null;

    // Calculate season dates
    // Academic year runs August 1 - July 31
    const now_date = new Date();
    const currentYear = now_date.getFullYear();
    const currentMonth = now_date.getMonth();

    // Determine current academic year
    let seasonStartYear: number;
    if (currentMonth >= 7) {
      // August or later = new academic year
      seasonStartYear = currentYear;
    } else {
      // Before August = previous academic year
      seasonStartYear = currentYear - 1;
    }

    // Parse requested season or use current
    let targetStartYear = seasonStartYear;
    if (args.seasonYear) {
      const parts = args.seasonYear.split("-");
      if (parts.length === 2) {
        targetStartYear = 2000 + parseInt(parts[0]);
      }
    }

    const seasonStart = new Date(targetStartYear, 7, 1); // August 1
    const seasonEnd = new Date(targetStartYear + 1, 6, 31, 23, 59, 59); // July 31

    const seasonYear = `${String(targetStartYear).slice(-2)}-${String(targetStartYear + 1).slice(-2)}`;
    const seasonLabel = `${targetStartYear}-${targetStartYear + 1} Season`;

    // Get all athletes on this team
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    const activeAthletes = athletes.filter((a) => !a.isDeleted);

    // Get all injuries for this team's athletes within the season
    const allInjuries: {
      _id: string;
      athleteId: string;
      bodyRegion: string;
      injuryDate: string;
      resolvedDate?: string;
      status: string;
      rtpStatus: string;
    }[] = [];

    for (const athlete of activeAthletes) {
      const injuries = await ctx.db
        .query("injuries")
        .withIndex("by_athleteId", (q) => q.eq("athleteId", athlete._id))
        .collect();

      for (const injury of injuries) {
        if (injury.isDeleted) continue;

        const injuryDate = new Date(injury.injuryDate);
        if (injuryDate >= seasonStart && injuryDate <= seasonEnd) {
          allInjuries.push({
            _id: injury._id,
            athleteId: injury.athleteId,
            bodyRegion: injury.bodyRegion,
            injuryDate: injury.injuryDate,
            resolvedDate: injury.resolvedDate,
            status: injury.status,
            rtpStatus: injury.rtpStatus,
          });
        }
      }
    }

    // Calculate injury stats
    const totalInjuries = allInjuries.length;
    const resolvedInjuries = allInjuries.filter((i) => i.status === "resolved").length;
    const activeInjuries = allInjuries.filter((i) => i.status === "active").length;

    // Calculate average recovery days for resolved injuries
    let avgRecoveryDays: number | undefined;
    const recoveryDays: number[] = [];
    for (const injury of allInjuries.filter((i) => i.status === "resolved" && i.resolvedDate)) {
      const start = new Date(injury.injuryDate);
      const end = new Date(injury.resolvedDate!);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) recoveryDays.push(days);
    }
    if (recoveryDays.length > 0) {
      avgRecoveryDays = Math.round(recoveryDays.reduce((a, b) => a + b, 0) / recoveryDays.length);
    }

    // Group injuries by body region
    const regionCounts: Record<string, number> = {};
    for (const injury of allInjuries) {
      regionCounts[injury.bodyRegion] = (regionCounts[injury.bodyRegion] || 0) + 1;
    }
    const injuriesByRegion = Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    // Get encounters for this season
    const allEncounters: { type: string }[] = [];
    for (const athlete of activeAthletes) {
      const encounters = await ctx.db
        .query("encounters")
        .withIndex("by_athleteId", (q) => q.eq("athleteId", athlete._id))
        .collect();

      for (const encounter of encounters) {
        if (encounter.isDeleted) continue;

        const encounterDate = new Date(encounter.encounterDatetime);
        if (encounterDate >= seasonStart && encounterDate <= seasonEnd) {
          allEncounters.push({ type: encounter.encounterType });
        }
      }
    }

    const totalEncounters = allEncounters.length;

    // Group encounters by type
    const typeCounts: Record<string, number> = {};
    for (const encounter of allEncounters) {
      typeCounts[encounter.type] = (typeCounts[encounter.type] || 0) + 1;
    }
    const encountersByType = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Count athletes with injuries this season
    const athletesWithInjuriesSet = new Set(allInjuries.map((i) => i.athleteId));
    const athletesWithInjuries = athletesWithInjuriesSet.size;

    // Calculate total days limited/out (simplified estimation)
    // This counts injuries and their RTP status
    let totalDaysLimited = 0;
    let totalDaysOut = 0;
    for (const injury of allInjuries) {
      const start = new Date(injury.injuryDate);
      const end = injury.resolvedDate ? new Date(injury.resolvedDate) : now_date;
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      if (injury.rtpStatus === "out") {
        totalDaysOut += days;
      } else if (injury.rtpStatus === "limited") {
        totalDaysLimited += days;
      }
    }

    // Determine available seasons (from team creation to current)
    const teamCreated = new Date(team.createdAt);
    let createdYear = teamCreated.getFullYear();
    if (teamCreated.getMonth() < 7) createdYear--; // Before August

    const availableSeasons: string[] = [];
    for (let year = createdYear; year <= seasonStartYear; year++) {
      availableSeasons.push(`${String(year).slice(-2)}-${String(year + 1).slice(-2)}`);
    }
    availableSeasons.reverse(); // Most recent first

    return {
      seasonYear,
      seasonLabel,
      startDate: seasonStart.toISOString().split("T")[0],
      endDate: seasonEnd.toISOString().split("T")[0],
      totalInjuries,
      resolvedInjuries,
      activeInjuries,
      avgRecoveryDays,
      injuriesByRegion,
      totalEncounters,
      encountersByType,
      totalAthletes: activeAthletes.length,
      athletesWithInjuries,
      totalDaysLimited,
      totalDaysOut,
      availableSeasons,
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
