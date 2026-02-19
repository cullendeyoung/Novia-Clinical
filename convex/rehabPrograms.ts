/**
 * Rehab Program management functions
 *
 * Rehab programs are exercise/rehabilitation programs linked to injuries.
 * They contain exercises with sets, reps, and other parameters that are
 * visible to both the AT and the athlete.
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
} from "./authz";

// Rehab program status validator
const rehabProgramStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("paused"),
  v.literal("discontinued")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get rehab programs for an athlete
 */
export const getByAthlete = query({
  args: {
    athleteId: v.id("athletes"),
    status: v.optional(rehabProgramStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("rehabPrograms"),
      name: v.string(),
      description: v.optional(v.string()),
      status: rehabProgramStatusValidator,
      startDate: v.string(),
      targetEndDate: v.optional(v.string()),
      injuryId: v.id("injuries"),
      injuryBodyRegion: v.string(),
      injurySide: v.string(),
      exerciseCount: v.number(),
      createdByName: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "read");

    await verifyAthleteInOrg(ctx, auth, args.athleteId);

    let programs = await ctx.db
      .query("rehabPrograms")
      .withIndex("by_athleteId", (q) => q.eq("athleteId", args.athleteId))
      .order("desc")
      .collect();

    programs = programs.filter((p) => !p.isDeleted);

    if (args.status) {
      programs = programs.filter((p) => p.status === args.status);
    }

    const result = await Promise.all(
      programs.map(async (program) => {
        const injury = await ctx.db.get(program.injuryId);
        const createdBy = await ctx.db.get(program.createdByUserId);

        // Count exercises
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
          injuryId: program.injuryId,
          injuryBodyRegion: injury?.bodyRegion || "Unknown",
          injurySide: injury?.side || "NA",
          exerciseCount: exercises.filter((e) => e.isActive).length,
          createdByName: createdBy?.fullName || "Unknown",
          createdAt: program.createdAt,
        };
      })
    );

    return result;
  },
});

/**
 * Get active rehab programs for an athlete (for athlete profile/portal)
 */
export const getActiveByAthlete = query({
  args: { athleteId: v.id("athletes") },
  returns: v.array(
    v.object({
      _id: v.id("rehabPrograms"),
      name: v.string(),
      description: v.optional(v.string()),
      status: rehabProgramStatusValidator,
      startDate: v.string(),
      injuryBodyRegion: v.string(),
      exercises: v.array(
        v.object({
          _id: v.id("rehabExercises"),
          name: v.string(),
          description: v.optional(v.string()),
          sets: v.optional(v.number()),
          reps: v.optional(v.string()),
          holdSeconds: v.optional(v.number()),
          durationMinutes: v.optional(v.number()),
          frequency: v.optional(v.string()),
          equipment: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    await verifyAthleteInOrg(ctx, auth, args.athleteId);

    const programs = await ctx.db
      .query("rehabPrograms")
      .withIndex("by_athleteId_and_status", (q) =>
        q.eq("athleteId", args.athleteId).eq("status", "active")
      )
      .collect();

    const result = await Promise.all(
      programs
        .filter((p) => !p.isDeleted)
        .map(async (program) => {
          const injury = await ctx.db.get(program.injuryId);

          const exercises = await ctx.db
            .query("rehabExercises")
            .withIndex("by_rehabProgramId_and_orderIndex", (q) =>
              q.eq("rehabProgramId", program._id)
            )
            .collect();

          return {
            _id: program._id,
            name: program.name,
            description: program.description,
            status: program.status,
            startDate: program.startDate,
            injuryBodyRegion: injury?.bodyRegion || "Unknown",
            exercises: exercises
              .filter((e) => e.isActive)
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((e) => ({
                _id: e._id,
                name: e.name,
                description: e.description,
                sets: e.sets,
                reps: e.reps,
                holdSeconds: e.holdSeconds,
                durationMinutes: e.durationMinutes,
                frequency: e.frequency,
                equipment: e.equipment,
                notes: e.notes,
              })),
          };
        })
    );

    return result;
  },
});

/**
 * Get a single rehab program with full details
 */
export const getById = query({
  args: { programId: v.id("rehabPrograms") },
  returns: v.union(
    v.object({
      _id: v.id("rehabPrograms"),
      athleteId: v.id("athletes"),
      athleteName: v.string(),
      injuryId: v.id("injuries"),
      injuryBodyRegion: v.string(),
      injurySide: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      status: rehabProgramStatusValidator,
      startDate: v.string(),
      targetEndDate: v.optional(v.string()),
      actualEndDate: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdByUserId: v.id("users"),
      createdByName: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      exercises: v.array(
        v.object({
          _id: v.id("rehabExercises"),
          name: v.string(),
          description: v.optional(v.string()),
          sets: v.optional(v.number()),
          reps: v.optional(v.string()),
          holdSeconds: v.optional(v.number()),
          durationMinutes: v.optional(v.number()),
          frequency: v.optional(v.string()),
          equipment: v.optional(v.string()),
          videoUrl: v.optional(v.string()),
          imageUrl: v.optional(v.string()),
          orderIndex: v.number(),
          isActive: v.boolean(),
          notes: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "read");

    const program = await ctx.db.get(args.programId);
    if (!program || program.isDeleted) return null;

    // Verify org access
    if (program.orgId !== auth.orgId) {
      throw new Error("Access denied");
    }

    const athlete = await ctx.db.get(program.athleteId);
    const injury = await ctx.db.get(program.injuryId);
    const createdBy = await ctx.db.get(program.createdByUserId);

    const exercises = await ctx.db
      .query("rehabExercises")
      .withIndex("by_rehabProgramId_and_orderIndex", (q) =>
        q.eq("rehabProgramId", program._id)
      )
      .collect();

    return {
      _id: program._id,
      athleteId: program.athleteId,
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Unknown",
      injuryId: program.injuryId,
      injuryBodyRegion: injury?.bodyRegion || "Unknown",
      injurySide: injury?.side || "NA",
      name: program.name,
      description: program.description,
      status: program.status,
      startDate: program.startDate,
      targetEndDate: program.targetEndDate,
      actualEndDate: program.actualEndDate,
      notes: program.notes,
      createdByUserId: program.createdByUserId,
      createdByName: createdBy?.fullName || "Unknown",
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
      exercises: exercises
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((e) => ({
          _id: e._id,
          name: e.name,
          description: e.description,
          sets: e.sets,
          reps: e.reps,
          holdSeconds: e.holdSeconds,
          durationMinutes: e.durationMinutes,
          frequency: e.frequency,
          equipment: e.equipment,
          videoUrl: e.videoUrl,
          imageUrl: e.imageUrl,
          orderIndex: e.orderIndex,
          isActive: e.isActive,
          notes: e.notes,
        })),
    };
  },
});

/**
 * Get rehab programs for an injury
 */
export const getByInjury = query({
  args: { injuryId: v.id("injuries") },
  returns: v.array(
    v.object({
      _id: v.id("rehabPrograms"),
      name: v.string(),
      status: rehabProgramStatusValidator,
      startDate: v.string(),
      exerciseCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "read");

    await verifyInjuryInOrg(ctx, auth, args.injuryId);

    const programs = await ctx.db
      .query("rehabPrograms")
      .withIndex("by_injuryId", (q) => q.eq("injuryId", args.injuryId))
      .order("desc")
      .collect();

    const result = await Promise.all(
      programs
        .filter((p) => !p.isDeleted)
        .map(async (program) => {
          const exercises = await ctx.db
            .query("rehabExercises")
            .withIndex("by_rehabProgramId", (q) => q.eq("rehabProgramId", program._id))
            .collect();

          return {
            _id: program._id,
            name: program.name,
            status: program.status,
            startDate: program.startDate,
            exerciseCount: exercises.filter((e) => e.isActive).length,
          };
        })
    );

    return result;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new rehab program
 */
export const create = mutation({
  args: {
    athleteId: v.id("athletes"),
    injuryId: v.id("injuries"),
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    targetEndDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    exercises: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.optional(v.string()),
          sets: v.optional(v.number()),
          reps: v.optional(v.string()),
          holdSeconds: v.optional(v.number()),
          durationMinutes: v.optional(v.number()),
          frequency: v.optional(v.string()),
          equipment: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      )
    ),
  },
  returns: v.id("rehabPrograms"),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "create");

    const athlete = await verifyAthleteInOrg(ctx, auth, args.athleteId);
    const injury = await verifyInjuryInOrg(ctx, auth, args.injuryId);

    // Verify injury belongs to athlete
    if (injury.athleteId !== args.athleteId) {
      throw new Error("Injury does not belong to this athlete");
    }

    const timestamp = now();
    const startDate = args.startDate || new Date().toISOString().split("T")[0];

    const programId = await ctx.db.insert("rehabPrograms", {
      orgId: auth.orgId,
      athleteId: args.athleteId,
      injuryId: args.injuryId,
      name: args.name,
      description: args.description,
      status: "active",
      startDate,
      targetEndDate: args.targetEndDate,
      notes: args.notes,
      createdByUserId: auth.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Add exercises if provided
    if (args.exercises && args.exercises.length > 0) {
      for (let i = 0; i < args.exercises.length; i++) {
        const exercise = args.exercises[i];
        await ctx.db.insert("rehabExercises", {
          orgId: auth.orgId,
          rehabProgramId: programId,
          name: exercise.name,
          description: exercise.description,
          sets: exercise.sets,
          reps: exercise.reps,
          holdSeconds: exercise.holdSeconds,
          durationMinutes: exercise.durationMinutes,
          frequency: exercise.frequency,
          equipment: exercise.equipment,
          notes: exercise.notes,
          orderIndex: i,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    // Log the creation
    await logAuditEvent(ctx, auth, auth.orgId, "create", "rehab_program", programId, {
      athleteName: `${athlete.firstName} ${athlete.lastName}`,
      programName: args.name,
      injuryBodyRegion: injury.bodyRegion,
    });

    return programId;
  },
});

/**
 * Update a rehab program
 */
export const update = mutation({
  args: {
    programId: v.id("rehabPrograms"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(rehabProgramStatusValidator),
    targetEndDate: v.optional(v.string()),
    actualEndDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "update");

    const program = await ctx.db.get(args.programId);
    if (!program || program.isDeleted) {
      throw new Error("Program not found");
    }

    if (program.orgId !== auth.orgId) {
      throw new Error("Access denied");
    }

    const updates: Record<string, unknown> = {
      updatedAt: now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.targetEndDate !== undefined) updates.targetEndDate = args.targetEndDate;
    if (args.actualEndDate !== undefined) updates.actualEndDate = args.actualEndDate;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.programId, updates);

    await logAuditEvent(ctx, auth, auth.orgId, "update", "rehab_program", args.programId, {
      updates: Object.keys(updates),
    });

    return true;
  },
});

/**
 * Add exercise to a program
 */
export const addExercise = mutation({
  args: {
    programId: v.id("rehabPrograms"),
    name: v.string(),
    description: v.optional(v.string()),
    sets: v.optional(v.number()),
    reps: v.optional(v.string()),
    holdSeconds: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    frequency: v.optional(v.string()),
    equipment: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("rehabExercises"),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "update");

    const program = await ctx.db.get(args.programId);
    if (!program || program.isDeleted) {
      throw new Error("Program not found");
    }

    if (program.orgId !== auth.orgId) {
      throw new Error("Access denied");
    }

    // Get max order index
    const exercises = await ctx.db
      .query("rehabExercises")
      .withIndex("by_rehabProgramId", (q) => q.eq("rehabProgramId", args.programId))
      .collect();

    const maxOrder = exercises.reduce((max, e) => Math.max(max, e.orderIndex), -1);

    const timestamp = now();

    const exerciseId = await ctx.db.insert("rehabExercises", {
      orgId: auth.orgId,
      rehabProgramId: args.programId,
      name: args.name,
      description: args.description,
      sets: args.sets,
      reps: args.reps,
      holdSeconds: args.holdSeconds,
      durationMinutes: args.durationMinutes,
      frequency: args.frequency,
      equipment: args.equipment,
      videoUrl: args.videoUrl,
      imageUrl: args.imageUrl,
      notes: args.notes,
      orderIndex: maxOrder + 1,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await ctx.db.patch(args.programId, { updatedAt: timestamp });

    return exerciseId;
  },
});

/**
 * Update an exercise
 */
export const updateExercise = mutation({
  args: {
    exerciseId: v.id("rehabExercises"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sets: v.optional(v.number()),
    reps: v.optional(v.string()),
    holdSeconds: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    frequency: v.optional(v.string()),
    equipment: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "update");

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    if (exercise.orgId !== auth.orgId) {
      throw new Error("Access denied");
    }

    const updates: Record<string, unknown> = {
      updatedAt: now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.sets !== undefined) updates.sets = args.sets;
    if (args.reps !== undefined) updates.reps = args.reps;
    if (args.holdSeconds !== undefined) updates.holdSeconds = args.holdSeconds;
    if (args.durationMinutes !== undefined) updates.durationMinutes = args.durationMinutes;
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.equipment !== undefined) updates.equipment = args.equipment;
    if (args.videoUrl !== undefined) updates.videoUrl = args.videoUrl;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.exerciseId, updates);

    // Update program timestamp
    await ctx.db.patch(exercise.rehabProgramId, { updatedAt: now() });

    return true;
  },
});

/**
 * Delete an exercise
 */
export const deleteExercise = mutation({
  args: { exerciseId: v.id("rehabExercises") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "delete");

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    if (exercise.orgId !== auth.orgId) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.exerciseId);

    // Update program timestamp
    await ctx.db.patch(exercise.rehabProgramId, { updatedAt: now() });

    return true;
  },
});

/**
 * Reorder exercises
 */
export const reorderExercises = mutation({
  args: {
    programId: v.id("rehabPrograms"),
    exerciseIds: v.array(v.id("rehabExercises")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "update");

    const program = await ctx.db.get(args.programId);
    if (!program || program.isDeleted) {
      throw new Error("Program not found");
    }

    if (program.orgId !== auth.orgId) {
      throw new Error("Access denied");
    }

    const timestamp = now();

    for (let i = 0; i < args.exerciseIds.length; i++) {
      await ctx.db.patch(args.exerciseIds[i], {
        orderIndex: i,
        updatedAt: timestamp,
      });
    }

    await ctx.db.patch(args.programId, { updatedAt: timestamp });

    return true;
  },
});

/**
 * Soft delete a rehab program
 */
export const remove = mutation({
  args: { programId: v.id("rehabPrograms") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requirePermission(auth, "encounter", "delete");

    const program = await ctx.db.get(args.programId);
    if (!program || program.isDeleted) {
      throw new Error("Program not found");
    }

    if (program.orgId !== auth.orgId) {
      throw new Error("Access denied");
    }

    const timestamp = now();

    await ctx.db.patch(args.programId, {
      isDeleted: true,
      deletedAt: timestamp,
      updatedAt: timestamp,
    });

    await logAuditEvent(ctx, auth, auth.orgId, "delete", "rehab_program", args.programId);

    return true;
  },
});
