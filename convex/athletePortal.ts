/**
 * Athlete Portal queries
 *
 * These queries allow athletes to access their own data after logging in.
 * Athletes are users with role="athlete" linked to an athlete record via userId.
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireAuth, logAuditEvent, now } from "./authz";
import type { Id, Doc } from "./_generated/dataModel";

// =============================================================================
// Helper: Get athlete record for current user
// =============================================================================

async function getAthleteForCurrentUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"athletes"> | null> {
  const athlete = await ctx.db
    .query("athletes")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!athlete || athlete.isDeleted) {
    return null;
  }

  return athlete;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get current athlete's profile
 */
export const getMyProfile = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("athletes"),
      firstName: v.string(),
      lastName: v.string(),
      preferredName: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      sex: v.optional(v.union(v.literal("M"), v.literal("F"), v.literal("Other"))),
      classYear: v.optional(v.string()),
      jerseyNumber: v.optional(v.string()),
      position: v.optional(v.string()),
      heightInches: v.optional(v.number()),
      weightLbs: v.optional(v.number()),
      dominantHand: v.optional(v.union(v.literal("Left"), v.literal("Right"), v.literal("Ambidextrous"))),
      addressStreet: v.optional(v.string()),
      addressCity: v.optional(v.string()),
      addressState: v.optional(v.string()),
      addressZip: v.optional(v.string()),
      emergencyContactName: v.optional(v.string()),
      emergencyContactPhone: v.optional(v.string()),
      emergencyContactRelationship: v.optional(v.string()),
      emergencyContact2Name: v.optional(v.string()),
      emergencyContact2Phone: v.optional(v.string()),
      emergencyContact2Relationship: v.optional(v.string()),
      allergies: v.optional(v.string()),
      medications: v.optional(v.string()),
      medicalConditions: v.optional(v.string()),
      previousSurgeries: v.optional(v.string()),
      previousInjuries: v.optional(v.string()),
      insuranceProvider: v.optional(v.string()),
      insurancePolicyNumber: v.optional(v.string()),
      insuranceGroupNumber: v.optional(v.string()),
      insurancePhone: v.optional(v.string()),
      policyHolderName: v.optional(v.string()),
      policyHolderRelationship: v.optional(v.string()),
      primaryPhysicianName: v.optional(v.string()),
      primaryPhysicianPhone: v.optional(v.string()),
      availabilityStatus: v.optional(v.union(v.literal("healthy"), v.literal("limited"), v.literal("out"))),
      teamName: v.string(),
      orgName: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const auth = await requireAuth(ctx);

    // Only athletes can access this
    if (auth.role !== "athlete") {
      return null;
    }

    const athlete = await getAthleteForCurrentUser(ctx, auth.userId);
    if (!athlete) {
      return null;
    }

    const team = await ctx.db.get(athlete.teamId);
    const org = await ctx.db.get(athlete.orgId);

    return {
      _id: athlete._id,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      preferredName: athlete.preferredName,
      email: athlete.email,
      phone: athlete.phone,
      dateOfBirth: athlete.dateOfBirth,
      sex: athlete.sex,
      classYear: athlete.classYear,
      jerseyNumber: athlete.jerseyNumber,
      position: athlete.position,
      heightInches: athlete.heightInches,
      weightLbs: athlete.weightLbs,
      dominantHand: athlete.dominantHand,
      addressStreet: athlete.addressStreet,
      addressCity: athlete.addressCity,
      addressState: athlete.addressState,
      addressZip: athlete.addressZip,
      emergencyContactName: athlete.emergencyContactName,
      emergencyContactPhone: athlete.emergencyContactPhone,
      emergencyContactRelationship: athlete.emergencyContactRelationship,
      emergencyContact2Name: athlete.emergencyContact2Name,
      emergencyContact2Phone: athlete.emergencyContact2Phone,
      emergencyContact2Relationship: athlete.emergencyContact2Relationship,
      allergies: athlete.allergies,
      medications: athlete.medications,
      medicalConditions: athlete.medicalConditions,
      previousSurgeries: athlete.previousSurgeries,
      previousInjuries: athlete.previousInjuries,
      insuranceProvider: athlete.insuranceProvider,
      insurancePolicyNumber: athlete.insurancePolicyNumber,
      insuranceGroupNumber: athlete.insuranceGroupNumber,
      insurancePhone: athlete.insurancePhone,
      policyHolderName: athlete.policyHolderName,
      policyHolderRelationship: athlete.policyHolderRelationship,
      primaryPhysicianName: athlete.primaryPhysicianName,
      primaryPhysicianPhone: athlete.primaryPhysicianPhone,
      availabilityStatus: athlete.availabilityStatus,
      teamName: team?.name || "Unknown Team",
      orgName: org?.name || "Unknown Organization",
    };
  },
});

/**
 * Get current athlete's injuries (active and resolved)
 */
export const getMyInjuries = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("injuries"),
      injuryDate: v.string(),
      bodyRegion: v.string(),
      side: v.union(v.literal("L"), v.literal("R"), v.literal("Bilateral"), v.literal("NA")),
      mechanism: v.optional(v.string()),
      diagnosis: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("resolved")),
      rtpStatus: v.union(v.literal("full"), v.literal("limited"), v.literal("out")),
      resolvedDate: v.optional(v.string()),
      encounterCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    const auth = await requireAuth(ctx);

    if (auth.role !== "athlete") {
      return [];
    }

    const athlete = await getAthleteForCurrentUser(ctx, auth.userId);
    if (!athlete) {
      return [];
    }

    const injuries = await ctx.db
      .query("injuries")
      .withIndex("by_athleteId", (q) => q.eq("athleteId", athlete._id))
      .collect();

    const result = await Promise.all(
      injuries
        .filter((i) => !i.isDeleted)
        .map(async (injury) => {
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
            encounterCount,
          };
        })
    );

    // Sort: active first, then by date
    return result.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "active" ? -1 : 1;
      }
      return new Date(b.injuryDate).getTime() - new Date(a.injuryDate).getTime();
    });
  },
});

/**
 * Get current athlete's rehab programs
 */
export const getMyRehabPrograms = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("rehabPrograms"),
      name: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("completed"), v.literal("paused"), v.literal("discontinued")),
      startDate: v.string(),
      targetEndDate: v.optional(v.string()),
      injuryBodyRegion: v.string(),
      injurySide: v.string(),
      exerciseCount: v.number(),
      isPrehab: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx) => {
    const auth = await requireAuth(ctx);

    if (auth.role !== "athlete") {
      return [];
    }

    const athlete = await getAthleteForCurrentUser(ctx, auth.userId);
    if (!athlete) {
      return [];
    }

    const programs = await ctx.db
      .query("rehabPrograms")
      .withIndex("by_athleteId", (q) => q.eq("athleteId", athlete._id))
      .order("desc")
      .collect();

    const result = await Promise.all(
      programs
        .filter((p) => !p.isDeleted)
        .map(async (program) => {
          const injury = program.injuryId ? await ctx.db.get(program.injuryId) : null;

          const exercises = await ctx.db
            .query("rehabExercises")
            .withIndex("by_rehabProgramId", (q) => q.eq("rehabProgramId", program._id))
            .collect();
          const exerciseCount = exercises.filter((e) => e.isActive).length;

          return {
            _id: program._id,
            name: program.name,
            description: program.description,
            status: program.status,
            startDate: program.startDate,
            targetEndDate: program.targetEndDate,
            injuryBodyRegion: program.isPrehab ? "Prehab" : (injury?.bodyRegion || "Unknown"),
            injurySide: injury?.side || "NA",
            exerciseCount,
            isPrehab: program.isPrehab,
          };
        })
    );

    // Sort: active first, then completed, then paused, then discontinued
    const statusOrder: Record<string, number> = { active: 0, completed: 1, paused: 2, discontinued: 3 };
    return result.sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));
  },
});

/**
 * Get current athlete's encounters/documents
 */
export const getMyEncounters = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("encounters"),
      encounterType: v.string(),
      encounterDatetime: v.number(),
      providerName: v.string(),
      injuryBodyRegion: v.optional(v.string()),
      subjectiveText: v.optional(v.string()),
      objectiveText: v.optional(v.string()),
      assessmentText: v.optional(v.string()),
      planText: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    if (auth.role !== "athlete") {
      return [];
    }

    const athlete = await getAthleteForCurrentUser(ctx, auth.userId);
    if (!athlete) {
      return [];
    }

    const encounters = await ctx.db
      .query("encounters")
      .withIndex("by_athleteId", (q) => q.eq("athleteId", athlete._id))
      .order("desc")
      .collect();

    const activeEncounters = encounters.filter((e) => !e.isDeleted && !e.isArchived);
    const limited = args.limit ? activeEncounters.slice(0, args.limit) : activeEncounters;

    const result = await Promise.all(
      limited.map(async (enc) => {
        const provider = await ctx.db.get(enc.providerUserId);
        const injury = enc.injuryId ? await ctx.db.get(enc.injuryId) : null;

        return {
          _id: enc._id,
          encounterType: enc.encounterType,
          encounterDatetime: enc.encounterDatetime,
          providerName: provider?.fullName || "Unknown",
          injuryBodyRegion: injury?.bodyRegion,
          subjectiveText: enc.subjectiveText,
          objectiveText: enc.objectiveText,
          assessmentText: enc.assessmentText,
          planText: enc.planText,
        };
      })
    );

    return result;
  },
});

/**
 * Get a single encounter detail for the athlete
 */
export const getMyEncounterById = query({
  args: { encounterId: v.id("encounters") },
  returns: v.union(
    v.object({
      _id: v.id("encounters"),
      encounterType: v.string(),
      encounterDatetime: v.number(),
      providerName: v.string(),
      injuryBodyRegion: v.optional(v.string()),
      injurySide: v.optional(v.string()),
      subjectiveText: v.optional(v.string()),
      objectiveText: v.optional(v.string()),
      assessmentText: v.optional(v.string()),
      planText: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    if (auth.role !== "athlete") {
      return null;
    }

    const athlete = await getAthleteForCurrentUser(ctx, auth.userId);
    if (!athlete) {
      return null;
    }

    const encounter = await ctx.db.get(args.encounterId);
    if (!encounter || encounter.isDeleted || encounter.athleteId !== athlete._id) {
      return null;
    }

    const provider = await ctx.db.get(encounter.providerUserId);
    const injury = encounter.injuryId ? await ctx.db.get(encounter.injuryId) : null;

    return {
      _id: encounter._id,
      encounterType: encounter.encounterType,
      encounterDatetime: encounter.encounterDatetime,
      providerName: provider?.fullName || "Unknown",
      injuryBodyRegion: injury?.bodyRegion,
      injurySide: injury?.side,
      subjectiveText: encounter.subjectiveText,
      objectiveText: encounter.objectiveText,
      assessmentText: encounter.assessmentText,
      planText: encounter.planText,
    };
  },
});

/**
 * Get a single rehab program detail for the athlete
 */
export const getMyRehabProgramById = query({
  args: { programId: v.id("rehabPrograms") },
  returns: v.union(
    v.object({
      _id: v.id("rehabPrograms"),
      name: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("completed"), v.literal("paused"), v.literal("discontinued")),
      startDate: v.string(),
      targetEndDate: v.optional(v.string()),
      injuryBodyRegion: v.string(),
      exercises: v.array(
        v.object({
          _id: v.id("rehabExercises"),
          name: v.string(),
          description: v.optional(v.string()),
          sets: v.optional(v.number()),
          reps: v.optional(v.string()),
          durationMinutes: v.optional(v.number()),
          frequency: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    if (auth.role !== "athlete") {
      return null;
    }

    const athlete = await getAthleteForCurrentUser(ctx, auth.userId);
    if (!athlete) {
      return null;
    }

    const program = await ctx.db.get(args.programId);
    if (!program || program.isDeleted || program.athleteId !== athlete._id) {
      return null;
    }

    const injury = program.injuryId ? await ctx.db.get(program.injuryId) : null;

    const exercises = await ctx.db
      .query("rehabExercises")
      .withIndex("by_rehabProgramId", (q) => q.eq("rehabProgramId", program._id))
      .collect();

    return {
      _id: program._id,
      name: program.name,
      description: program.description,
      status: program.status,
      startDate: program.startDate,
      targetEndDate: program.targetEndDate,
      injuryBodyRegion: program.isPrehab ? "Prehab" : (injury?.bodyRegion || "Unknown"),
      exercises: exercises
        .filter((e) => e.isActive)
        .map((e) => ({
          _id: e._id,
          name: e.name,
          description: e.description,
          sets: e.sets,
          reps: e.reps,
          durationMinutes: e.durationMinutes,
          frequency: e.frequency,
          notes: e.notes,
        })),
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update athlete's own profile (limited fields)
 */
export const updateMyProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    addressStreet: v.optional(v.string()),
    addressCity: v.optional(v.string()),
    addressState: v.optional(v.string()),
    addressZip: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    emergencyContact2Name: v.optional(v.string()),
    emergencyContact2Phone: v.optional(v.string()),
    emergencyContact2Relationship: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    insurancePhone: v.optional(v.string()),
    policyHolderName: v.optional(v.string()),
    policyHolderRelationship: v.optional(v.string()),
    primaryPhysicianName: v.optional(v.string()),
    primaryPhysicianPhone: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    if (auth.role !== "athlete") {
      throw new Error("Only athletes can update their own profile");
    }

    const athlete = await getAthleteForCurrentUser(ctx, auth.userId);
    if (!athlete) {
      throw new Error("Athlete profile not found");
    }

    const timestamp = now();

    await ctx.db.patch(athlete._id, {
      ...args,
      updatedAt: timestamp,
      profileCompletedAt: athlete.profileCompletedAt ?? timestamp,
    });

    await logAuditEvent(ctx, auth, auth.orgId, "update", "athlete", athlete._id, {
      action: "self_update_profile",
    });

    return true;
  },
});
