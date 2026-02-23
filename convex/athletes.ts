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
// Availability status validator for list queries
const availabilityStatusValidatorForList = v.optional(
  v.union(v.literal("healthy"), v.literal("limited"), v.literal("out"))
);

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
      availabilityStatus: availabilityStatusValidatorForList,
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "read");

    // Verify team access
    await verifyTeamInOrg(ctx, auth, args.teamId);
    // Org admins and ATs have access to all teams in the org
    if (auth.role !== "org_admin" && auth.role !== "athletic_trainer" && !hasTeamAccess(auth, args.teamId)) {
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
            availabilityStatus: a.availabilityStatus,
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
// Availability status validator for return types
const availabilityStatusValidatorOptional = v.optional(
  v.union(v.literal("healthy"), v.literal("limited"), v.literal("out"))
);

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
      email: v.optional(v.string()),
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
      profileCompletedAt: v.optional(v.number()),
      inviteSentAt: v.optional(v.number()),
      // Availability status fields
      availabilityStatus: availabilityStatusValidatorOptional,
      availabilityStatusNote: v.optional(v.string()),
      availabilityStatusUpdatedAt: v.optional(v.number()),
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
      email: athlete.email,
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
      profileCompletedAt: athlete.profileCompletedAt,
      inviteSentAt: athlete.inviteSentAt,
      // Availability status
      availabilityStatus: athlete.availabilityStatus,
      availabilityStatusNote: athlete.availabilityStatusNote,
      availabilityStatusUpdatedAt: athlete.availabilityStatusUpdatedAt,
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
    // Org admins and ATs have org-wide access to all athletes
    const filtered = athletes.filter((a) => {
      if (a.isDeleted || !a.isActive) return false;
      if (auth.role !== "org_admin" && auth.role !== "athletic_trainer" && !hasTeamAccess(auth, a.teamId)) return false;

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
 * List all athletes across all teams (for org-wide views)
 */
export const listAll = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("athletes"),
      teamId: v.id("teams"),
      teamName: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      email: v.optional(v.string()),
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

    // Get all athletes for the org
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
      .collect();

    // Filter and enrich
    const result = await Promise.all(
      athletes
        .filter((a) => {
          if (a.isDeleted) return false;
          if (!args.includeInactive && !a.isActive) return false;
          // Org admins and ATs have access to all teams
          if (auth.role !== "org_admin" && auth.role !== "athletic_trainer" && !hasTeamAccess(auth, a.teamId)) {
            return false;
          }
          return true;
        })
        .map(async (a) => {
          // Get team info
          const team = await ctx.db.get(a.teamId);

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
            teamId: a.teamId,
            teamName: team?.name || "Unknown Team",
            firstName: a.firstName,
            lastName: a.lastName,
            email: a.email,
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

    // Sort by team, then last name
    return result.sort((a, b) => {
      const teamCompare = a.teamName.localeCompare(b.teamName);
      if (teamCompare !== 0) return teamCompare;
      return a.lastName.localeCompare(b.lastName);
    });
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

// Dominant hand validator
const dominantHandValidator = v.union(
  v.literal("Left"),
  v.literal("Right"),
  v.literal("Ambidextrous")
);

/**
 * Create a new athlete (AT adds to roster)
 */
export const create = mutation({
  args: {
    teamId: v.id("teams"),
    // Basic Info
    firstName: v.string(),
    lastName: v.string(),
    preferredName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    sex: v.optional(sexValidator),
    // Athletic Info
    classYear: v.optional(v.string()),
    jerseyNumber: v.optional(v.string()),
    position: v.optional(v.string()),
    heightInches: v.optional(v.number()),
    weightLbs: v.optional(v.number()),
    dominantHand: v.optional(dominantHandValidator),
    // Address
    addressStreet: v.optional(v.string()),
    addressCity: v.optional(v.string()),
    addressState: v.optional(v.string()),
    addressZip: v.optional(v.string()),
    // Emergency Contacts
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    emergencyContact2Name: v.optional(v.string()),
    emergencyContact2Phone: v.optional(v.string()),
    emergencyContact2Relationship: v.optional(v.string()),
    // Medical History
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    previousSurgeries: v.optional(v.string()),
    previousInjuries: v.optional(v.string()),
    // Insurance
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    insurancePhone: v.optional(v.string()),
    policyHolderName: v.optional(v.string()),
    policyHolderRelationship: v.optional(v.string()),
    // Primary Care
    primaryPhysicianName: v.optional(v.string()),
    primaryPhysicianPhone: v.optional(v.string()),
    // Notes
    notes: v.optional(v.string()),
    sendInvite: v.optional(v.boolean()),
  },
  returns: v.id("athletes"),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "create");

    // Verify team access
    await verifyTeamInOrg(ctx, auth, args.teamId);
    // Org admins and ATs have access to all teams in the org
    if (auth.role !== "org_admin" && auth.role !== "athletic_trainer" && !hasTeamAccess(auth, args.teamId)) {
      throw new Error("Access denied: You do not have access to this team");
    }

    const timestamp = now();

    const athleteId = await ctx.db.insert("athletes", {
      orgId: auth.orgId,
      teamId: args.teamId,
      // Basic Info
      firstName: args.firstName,
      lastName: args.lastName,
      preferredName: args.preferredName,
      email: args.email,
      phone: args.phone,
      dateOfBirth: args.dateOfBirth,
      sex: args.sex,
      // Athletic Info
      classYear: args.classYear,
      jerseyNumber: args.jerseyNumber,
      position: args.position,
      heightInches: args.heightInches,
      weightLbs: args.weightLbs,
      dominantHand: args.dominantHand,
      // Address
      addressStreet: args.addressStreet,
      addressCity: args.addressCity,
      addressState: args.addressState,
      addressZip: args.addressZip,
      // Emergency Contacts
      emergencyContactName: args.emergencyContactName,
      emergencyContactPhone: args.emergencyContactPhone,
      emergencyContactRelationship: args.emergencyContactRelationship,
      emergencyContact2Name: args.emergencyContact2Name,
      emergencyContact2Phone: args.emergencyContact2Phone,
      emergencyContact2Relationship: args.emergencyContact2Relationship,
      // Medical History
      allergies: args.allergies,
      medications: args.medications,
      medicalConditions: args.medicalConditions,
      previousSurgeries: args.previousSurgeries,
      previousInjuries: args.previousInjuries,
      // Insurance
      insuranceProvider: args.insuranceProvider,
      insurancePolicyNumber: args.insurancePolicyNumber,
      insuranceGroupNumber: args.insuranceGroupNumber,
      insurancePhone: args.insurancePhone,
      policyHolderName: args.policyHolderName,
      policyHolderRelationship: args.policyHolderRelationship,
      // Primary Care
      primaryPhysicianName: args.primaryPhysicianName,
      primaryPhysicianPhone: args.primaryPhysicianPhone,
      // Notes
      notes: args.notes,
      inviteSentAt: args.sendInvite && args.email ? timestamp : undefined,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Log the creation
    await logAuditEvent(ctx, auth, auth.orgId, "create", "athlete", athleteId, {
      name: `${args.firstName} ${args.lastName}`,
      email: args.email,
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
    // Basic Info
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    preferredName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    sex: v.optional(sexValidator),
    // Athletic Info
    classYear: v.optional(v.string()),
    jerseyNumber: v.optional(v.string()),
    position: v.optional(v.string()),
    heightInches: v.optional(v.number()),
    weightLbs: v.optional(v.number()),
    dominantHand: v.optional(dominantHandValidator),
    // Address
    addressStreet: v.optional(v.string()),
    addressCity: v.optional(v.string()),
    addressState: v.optional(v.string()),
    addressZip: v.optional(v.string()),
    // Emergency Contacts
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    emergencyContact2Name: v.optional(v.string()),
    emergencyContact2Phone: v.optional(v.string()),
    emergencyContact2Relationship: v.optional(v.string()),
    // Medical History
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    previousSurgeries: v.optional(v.string()),
    previousInjuries: v.optional(v.string()),
    // Insurance
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    insurancePhone: v.optional(v.string()),
    policyHolderName: v.optional(v.string()),
    policyHolderRelationship: v.optional(v.string()),
    // Primary Care
    primaryPhysicianName: v.optional(v.string()),
    primaryPhysicianPhone: v.optional(v.string()),
    // Notes & Status
    notes: v.optional(v.string()),
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
    // Basic Info
    if (args.firstName !== undefined) updates.firstName = args.firstName;
    if (args.lastName !== undefined) updates.lastName = args.lastName;
    if (args.preferredName !== undefined) updates.preferredName = args.preferredName;
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.dateOfBirth !== undefined) updates.dateOfBirth = args.dateOfBirth;
    if (args.sex !== undefined) updates.sex = args.sex;
    // Athletic Info
    if (args.classYear !== undefined) updates.classYear = args.classYear;
    if (args.jerseyNumber !== undefined) updates.jerseyNumber = args.jerseyNumber;
    if (args.position !== undefined) updates.position = args.position;
    if (args.heightInches !== undefined) updates.heightInches = args.heightInches;
    if (args.weightLbs !== undefined) updates.weightLbs = args.weightLbs;
    if (args.dominantHand !== undefined) updates.dominantHand = args.dominantHand;
    // Address
    if (args.addressStreet !== undefined) updates.addressStreet = args.addressStreet;
    if (args.addressCity !== undefined) updates.addressCity = args.addressCity;
    if (args.addressState !== undefined) updates.addressState = args.addressState;
    if (args.addressZip !== undefined) updates.addressZip = args.addressZip;
    // Emergency Contacts
    if (args.emergencyContactName !== undefined) updates.emergencyContactName = args.emergencyContactName;
    if (args.emergencyContactPhone !== undefined) updates.emergencyContactPhone = args.emergencyContactPhone;
    if (args.emergencyContactRelationship !== undefined) updates.emergencyContactRelationship = args.emergencyContactRelationship;
    if (args.emergencyContact2Name !== undefined) updates.emergencyContact2Name = args.emergencyContact2Name;
    if (args.emergencyContact2Phone !== undefined) updates.emergencyContact2Phone = args.emergencyContact2Phone;
    if (args.emergencyContact2Relationship !== undefined) updates.emergencyContact2Relationship = args.emergencyContact2Relationship;
    // Medical History
    if (args.allergies !== undefined) updates.allergies = args.allergies;
    if (args.medications !== undefined) updates.medications = args.medications;
    if (args.medicalConditions !== undefined) updates.medicalConditions = args.medicalConditions;
    if (args.previousSurgeries !== undefined) updates.previousSurgeries = args.previousSurgeries;
    if (args.previousInjuries !== undefined) updates.previousInjuries = args.previousInjuries;
    // Insurance
    if (args.insuranceProvider !== undefined) updates.insuranceProvider = args.insuranceProvider;
    if (args.insurancePolicyNumber !== undefined) updates.insurancePolicyNumber = args.insurancePolicyNumber;
    if (args.insuranceGroupNumber !== undefined) updates.insuranceGroupNumber = args.insuranceGroupNumber;
    if (args.insurancePhone !== undefined) updates.insurancePhone = args.insurancePhone;
    if (args.policyHolderName !== undefined) updates.policyHolderName = args.policyHolderName;
    if (args.policyHolderRelationship !== undefined) updates.policyHolderRelationship = args.policyHolderRelationship;
    // Primary Care
    if (args.primaryPhysicianName !== undefined) updates.primaryPhysicianName = args.primaryPhysicianName;
    if (args.primaryPhysicianPhone !== undefined) updates.primaryPhysicianPhone = args.primaryPhysicianPhone;
    // Notes & Status
    if (args.notes !== undefined) updates.notes = args.notes;
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

// Availability status validator
const availabilityStatusValidator = v.union(
  v.literal("healthy"),
  v.literal("limited"),
  v.literal("out")
);

/**
 * Update an athlete's availability status
 * This allows ATs to manually set healthy/limited/out status
 */
export const updateAvailabilityStatus = mutation({
  args: {
    athleteId: v.id("athletes"),
    status: availabilityStatusValidator,
    note: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "athlete", "update");

    const athlete = await verifyAthleteInOrg(ctx, auth, args.athleteId);
    const timestamp = now();

    await ctx.db.patch(args.athleteId, {
      availabilityStatus: args.status,
      availabilityStatusNote: args.note,
      availabilityStatusUpdatedAt: timestamp,
      availabilityStatusUpdatedBy: auth.userId,
      updatedAt: timestamp,
    });

    // Log the status change
    await logAuditEvent(ctx, auth, auth.orgId, "update_status", "athlete", args.athleteId, {
      name: `${athlete.firstName} ${athlete.lastName}`,
      newStatus: args.status,
      note: args.note,
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
