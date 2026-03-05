import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  verifyPracticeAccess,
  requirePracticeAuth,
  requirePracticePermission,
  verifyPracticeUserInPractice,
} from "./practiceAuthz";

const appointmentTypeValidator = v.union(
  v.literal("initial_evaluation"),
  v.literal("follow_up"),
  v.literal("re_evaluation"),
  v.literal("discharge"),
  v.literal("consultation"),
  v.literal("other")
);

const appointmentStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("confirmed"),
  v.literal("checked_in"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("no_show")
);

// Get appointments for the entire clinic (all clinicians)
export const listByPractice = query({
  args: {
    practiceId: v.id("clinicPractices"),
    startDate: v.number(), // Unix timestamp
    endDate: v.number(), // Unix timestamp
    clinicianId: v.optional(v.id("practiceUsers")),
    status: v.optional(appointmentStatusValidator),
  },
  returns: v.array(
    v.object({
      _id: v.id("practiceAppointments"),
      scheduledStart: v.number(),
      scheduledEnd: v.number(),
      durationMinutes: v.number(),
      appointmentType: appointmentTypeValidator,
      title: v.optional(v.string()),
      status: appointmentStatusValidator,
      patient: v.object({
        _id: v.id("practicePatients"),
        firstName: v.string(),
        lastName: v.string(),
        preferredName: v.optional(v.string()),
      }),
      clinician: v.object({
        _id: v.id("practiceUsers"),
        fullName: v.string(),
        clinicianType: v.optional(v.string()),
      }),
      caseId: v.optional(v.id("practiceCases")),
      caseName: v.optional(v.string()),
      notes: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and belongs to this practice
    const auth = await verifyPracticeAccess(ctx, args.practiceId);
    requirePracticePermission(auth, "appointment", "read");

    let appointments = await ctx.db
      .query("practiceAppointments")
      .withIndex("by_practiceId_and_scheduledStart", (q) =>
        q
          .eq("practiceId", args.practiceId)
          .gte("scheduledStart", args.startDate)
          .lte("scheduledStart", args.endDate)
      )
      .collect();

    appointments = appointments.filter((a) => !a.isDeleted);

    // Filter by clinician
    if (args.clinicianId) {
      appointments = appointments.filter(
        (a) => a.clinicianId === args.clinicianId
      );
    }

    // Filter by status
    if (args.status) {
      appointments = appointments.filter((a) => a.status === args.status);
    }

    // Sort by time
    appointments.sort((a, b) => a.scheduledStart - b.scheduledStart);

    // Enrich with patient and clinician details
    const results = [];
    for (const apt of appointments) {
      const patient = await ctx.db.get(apt.patientId);
      const clinician = await ctx.db.get(apt.clinicianId);

      if (!patient || !clinician) continue;

      let caseName: string | undefined;
      if (apt.caseId) {
        const caseDoc = await ctx.db.get(apt.caseId);
        caseName = caseDoc?.caseName;
      }

      results.push({
        _id: apt._id,
        scheduledStart: apt.scheduledStart,
        scheduledEnd: apt.scheduledEnd,
        durationMinutes: apt.durationMinutes,
        appointmentType: apt.appointmentType,
        title: apt.title,
        status: apt.status,
        patient: {
          _id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          preferredName: patient.preferredName,
        },
        clinician: {
          _id: clinician._id,
          fullName: clinician.fullName,
          clinicianType: clinician.clinicianType,
        },
        caseId: apt.caseId,
        caseName,
        notes: apt.notes,
      });
    }

    return results;
  },
});

// Get appointments for a specific clinician
export const listByClinician = query({
  args: {
    clinicianId: v.id("practiceUsers"),
    startDate: v.number(),
    endDate: v.number(),
    includeCompleted: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("practiceAppointments"),
      scheduledStart: v.number(),
      scheduledEnd: v.number(),
      durationMinutes: v.number(),
      appointmentType: appointmentTypeValidator,
      title: v.optional(v.string()),
      status: appointmentStatusValidator,
      patientName: v.string(),
      patientId: v.id("practicePatients"),
      caseId: v.optional(v.id("practiceCases")),
      caseName: v.optional(v.string()),
      notes: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and clinician belongs to same practice
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "appointment", "read");
    await verifyPracticeUserInPractice(ctx, auth, args.clinicianId);

    let appointments = await ctx.db
      .query("practiceAppointments")
      .withIndex("by_clinicianId_and_scheduledStart", (q) =>
        q
          .eq("clinicianId", args.clinicianId)
          .gte("scheduledStart", args.startDate)
          .lte("scheduledStart", args.endDate)
      )
      .collect();

    appointments = appointments.filter((a) => !a.isDeleted);

    if (!args.includeCompleted) {
      appointments = appointments.filter(
        (a) => a.status !== "completed" && a.status !== "cancelled" && a.status !== "no_show"
      );
    }

    appointments.sort((a, b) => a.scheduledStart - b.scheduledStart);

    const results = [];
    for (const apt of appointments) {
      const patient = await ctx.db.get(apt.patientId);
      if (!patient) continue;

      let caseName: string | undefined;
      if (apt.caseId) {
        const caseDoc = await ctx.db.get(apt.caseId);
        caseName = caseDoc?.caseName;
      }

      results.push({
        _id: apt._id,
        scheduledStart: apt.scheduledStart,
        scheduledEnd: apt.scheduledEnd,
        durationMinutes: apt.durationMinutes,
        appointmentType: apt.appointmentType,
        title: apt.title,
        status: apt.status,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientId: patient._id,
        caseId: apt.caseId,
        caseName,
        notes: apt.notes,
      });
    }

    return results;
  },
});

// Get appointments for a patient (for patient portal)
export const listByPatient = query({
  args: {
    patientId: v.id("practicePatients"),
    includeHistory: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("practiceAppointments"),
      scheduledStart: v.number(),
      scheduledEnd: v.number(),
      durationMinutes: v.number(),
      appointmentType: appointmentTypeValidator,
      title: v.optional(v.string()),
      status: appointmentStatusValidator,
      clinicianName: v.string(),
      clinicianType: v.optional(v.string()),
      notes: v.optional(v.string()),
      isUpcoming: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "appointment", "read");

    // Verify patient belongs to user's practice
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Patient belongs to another practice");
    }

    const now = Date.now();

    let appointments = await ctx.db
      .query("practiceAppointments")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    appointments = appointments.filter((a) => !a.isDeleted);

    // Filter history based on flag
    if (!args.includeHistory) {
      // Only show upcoming and non-cancelled
      appointments = appointments.filter(
        (a) =>
          a.scheduledStart >= now ||
          (a.status !== "completed" &&
            a.status !== "cancelled" &&
            a.status !== "no_show")
      );
    }

    appointments.sort((a, b) => a.scheduledStart - b.scheduledStart);

    const results = [];
    for (const apt of appointments) {
      const clinician = await ctx.db.get(apt.clinicianId);
      if (!clinician) continue;

      results.push({
        _id: apt._id,
        scheduledStart: apt.scheduledStart,
        scheduledEnd: apt.scheduledEnd,
        durationMinutes: apt.durationMinutes,
        appointmentType: apt.appointmentType,
        title: apt.title,
        status: apt.status,
        clinicianName: clinician.fullName,
        clinicianType: clinician.clinicianType,
        notes: apt.notes,
        isUpcoming: apt.scheduledStart >= now,
      });
    }

    return results;
  },
});

// Get today's appointments for a clinician (dashboard view)
export const getTodayForClinician = query({
  args: {
    clinicianId: v.id("practiceUsers"),
  },
  returns: v.array(
    v.object({
      _id: v.id("practiceAppointments"),
      scheduledStart: v.number(),
      scheduledEnd: v.number(),
      appointmentType: appointmentTypeValidator,
      status: appointmentStatusValidator,
      patientName: v.string(),
      patientId: v.id("practicePatients"),
    })
  ),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and clinician belongs to same practice
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "appointment", "read");
    await verifyPracticeUserInPractice(ctx, auth, args.clinicianId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const appointments = await ctx.db
      .query("practiceAppointments")
      .withIndex("by_clinicianId_and_scheduledStart", (q) =>
        q
          .eq("clinicianId", args.clinicianId)
          .gte("scheduledStart", startOfDay)
          .lt("scheduledStart", endOfDay)
      )
      .collect();

    const validAppointments = appointments.filter(
      (a) => !a.isDeleted && a.status !== "cancelled"
    );

    validAppointments.sort((a, b) => a.scheduledStart - b.scheduledStart);

    const results = [];
    for (const apt of validAppointments) {
      const patient = await ctx.db.get(apt.patientId);
      if (!patient) continue;

      results.push({
        _id: apt._id,
        scheduledStart: apt.scheduledStart,
        scheduledEnd: apt.scheduledEnd,
        appointmentType: apt.appointmentType,
        status: apt.status,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientId: patient._id,
      });
    }

    return results;
  },
});

// Create a new appointment
export const create = mutation({
  args: {
    practiceId: v.id("clinicPractices"),
    patientId: v.id("practicePatients"),
    clinicianId: v.id("practiceUsers"),
    caseId: v.optional(v.id("practiceCases")),
    scheduledStart: v.number(),
    durationMinutes: v.number(),
    appointmentType: appointmentTypeValidator,
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("practiceAppointments"),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and belongs to this practice
    const auth = await verifyPracticeAccess(ctx, args.practiceId);
    requirePracticePermission(auth, "appointment", "create");

    const now = Date.now();
    const scheduledEnd = args.scheduledStart + args.durationMinutes * 60 * 1000;

    const appointmentId = await ctx.db.insert("practiceAppointments", {
      practiceId: args.practiceId,
      patientId: args.patientId,
      clinicianId: args.clinicianId,
      caseId: args.caseId,
      scheduledStart: args.scheduledStart,
      scheduledEnd,
      durationMinutes: args.durationMinutes,
      appointmentType: args.appointmentType,
      title: args.title,
      notes: args.notes,
      status: "scheduled",
      createdByUserId: auth.userId, // Use authenticated user's ID
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });

    return appointmentId;
  },
});

// Update appointment details
export const update = mutation({
  args: {
    appointmentId: v.id("practiceAppointments"),
    clinicianId: v.optional(v.id("practiceUsers")),
    caseId: v.optional(v.id("practiceCases")),
    scheduledStart: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    appointmentType: v.optional(appointmentTypeValidator),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and has permission
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "appointment", "update");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.isDeleted) {
      throw new Error("Appointment not found");
    }

    // HIPAA: Verify appointment belongs to user's practice
    if (appointment.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Appointment belongs to another practice");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.clinicianId !== undefined) updates.clinicianId = args.clinicianId;
    if (args.caseId !== undefined) updates.caseId = args.caseId;
    if (args.appointmentType !== undefined) updates.appointmentType = args.appointmentType;
    if (args.title !== undefined) updates.title = args.title;
    if (args.notes !== undefined) updates.notes = args.notes;

    // Handle time changes
    if (args.scheduledStart !== undefined || args.durationMinutes !== undefined) {
      const newStart = args.scheduledStart ?? appointment.scheduledStart;
      const newDuration = args.durationMinutes ?? appointment.durationMinutes;
      updates.scheduledStart = newStart;
      updates.durationMinutes = newDuration;
      updates.scheduledEnd = newStart + newDuration * 60 * 1000;
    }

    await ctx.db.patch(args.appointmentId, updates);

    return null;
  },
});

// Update appointment status
export const updateStatus = mutation({
  args: {
    appointmentId: v.id("practiceAppointments"),
    status: appointmentStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and has permission
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "appointment", "update");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.isDeleted) {
      throw new Error("Appointment not found");
    }

    // HIPAA: Verify appointment belongs to user's practice
    if (appointment.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Appointment belongs to another practice");
    }

    await ctx.db.patch(args.appointmentId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Cancel an appointment
export const cancel = mutation({
  args: {
    appointmentId: v.id("practiceAppointments"),
    cancelledByPatient: v.optional(v.boolean()),
    cancellationReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and has permission
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "appointment", "update");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.isDeleted) {
      throw new Error("Appointment not found");
    }

    // HIPAA: Verify appointment belongs to user's practice
    if (appointment.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Appointment belongs to another practice");
    }

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelledByUserId: auth.userId, // Use authenticated user's ID
      cancelledByPatient: args.cancelledByPatient,
      cancellationReason: args.cancellationReason,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Soft delete an appointment
export const remove = mutation({
  args: {
    appointmentId: v.id("practiceAppointments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and has delete permission
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "appointment", "delete");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // HIPAA: Verify appointment belongs to user's practice
    if (appointment.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Appointment belongs to another practice");
    }

    await ctx.db.patch(args.appointmentId, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Get clinician availability slots
export const getClinicianAvailability = query({
  args: {
    clinicianId: v.id("practiceUsers"),
    date: v.string(), // ISO date string YYYY-MM-DD
  },
  returns: v.object({
    workingHours: v.array(
      v.object({
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
    blockedSlots: v.array(
      v.object({
        startTime: v.number(),
        endTime: v.number(),
        reason: v.optional(v.string()),
      })
    ),
    bookedSlots: v.array(
      v.object({
        startTime: v.number(),
        endTime: v.number(),
        patientName: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and clinician belongs to same practice
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "availability", "read");
    await verifyPracticeUserInPractice(ctx, auth, args.clinicianId);

    const date = new Date(args.date);
    const dayOfWeek = date.getDay();

    // Get recurring working hours for this day
    const workingHours = await ctx.db
      .query("clinicianAvailability")
      .withIndex("by_clinicianId_and_dayOfWeek", (q) =>
        q.eq("clinicianId", args.clinicianId).eq("dayOfWeek", dayOfWeek)
      )
      .collect();

    const activeWorkingHours = workingHours
      .filter((h) => h.isActive && h.entryType === "working_hours")
      .map((h) => ({
        startTime: h.startTime || "09:00",
        endTime: h.endTime || "17:00",
      }));

    // Get blocked slots for this specific date
    const blockedEntries = await ctx.db
      .query("clinicianAvailability")
      .withIndex("by_specificDate", (q) => q.eq("specificDate", args.date))
      .collect();

    const blockedSlots = blockedEntries
      .filter(
        (e) =>
          e.clinicianId === args.clinicianId &&
          e.isActive &&
          e.entryType === "blocked"
      )
      .map((e) => ({
        startTime: e.specificStartTime || 0,
        endTime: e.specificEndTime || 0,
        reason: e.reason,
      }));

    // Get booked appointments for this date
    const startOfDay = new Date(args.date).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const appointments = await ctx.db
      .query("practiceAppointments")
      .withIndex("by_clinicianId_and_scheduledStart", (q) =>
        q
          .eq("clinicianId", args.clinicianId)
          .gte("scheduledStart", startOfDay)
          .lt("scheduledStart", endOfDay)
      )
      .collect();

    const bookedSlots = [];
    for (const apt of appointments) {
      if (apt.isDeleted || apt.status === "cancelled") continue;

      const patient = await ctx.db.get(apt.patientId);
      bookedSlots.push({
        startTime: apt.scheduledStart,
        endTime: apt.scheduledEnd,
        patientName: patient
          ? `${patient.firstName} ${patient.lastName}`
          : "Unknown",
      });
    }

    return {
      workingHours: activeWorkingHours.length > 0
        ? activeWorkingHours
        : [{ startTime: "09:00", endTime: "17:00" }], // Default
      blockedSlots,
      bookedSlots,
    };
  },
});

// Set clinician working hours
export const setWorkingHours = mutation({
  args: {
    practiceId: v.id("clinicPractices"),
    clinicianId: v.id("practiceUsers"),
    schedule: v.array(
      v.object({
        dayOfWeek: v.number(), // 0-6
        startTime: v.string(), // HH:MM
        endTime: v.string(), // HH:MM
        isActive: v.boolean(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and belongs to this practice
    const auth = await verifyPracticeAccess(ctx, args.practiceId);
    requirePracticePermission(auth, "availability", "update");

    const now = Date.now();

    // Delete existing working hours for this clinician
    const existing = await ctx.db
      .query("clinicianAvailability")
      .withIndex("by_clinicianId", (q) => q.eq("clinicianId", args.clinicianId))
      .collect();

    for (const entry of existing) {
      if (entry.entryType === "working_hours") {
        await ctx.db.delete(entry._id);
      }
    }

    // Create new working hours
    for (const day of args.schedule) {
      await ctx.db.insert("clinicianAvailability", {
        practiceId: args.practiceId,
        clinicianId: args.clinicianId,
        entryType: "working_hours",
        dayOfWeek: day.dayOfWeek,
        startTime: day.startTime,
        endTime: day.endTime,
        isActive: day.isActive,
        createdAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

// Block time off
export const blockTime = mutation({
  args: {
    practiceId: v.id("clinicPractices"),
    clinicianId: v.id("practiceUsers"),
    specificDate: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.id("clinicianAvailability"),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and belongs to this practice
    const auth = await verifyPracticeAccess(ctx, args.practiceId);
    requirePracticePermission(auth, "availability", "create");

    const now = Date.now();

    const entryId = await ctx.db.insert("clinicianAvailability", {
      practiceId: args.practiceId,
      clinicianId: args.clinicianId,
      entryType: "blocked",
      specificDate: args.specificDate,
      specificStartTime: args.startTime,
      specificEndTime: args.endTime,
      reason: args.reason,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return entryId;
  },
});
