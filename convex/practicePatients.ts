import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  verifyPracticeAccess,
  requirePracticeAuth,
  requirePracticePermission,
} from "./practiceAuthz";

const patientStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("discharged")
);

const sexValidator = v.union(v.literal("M"), v.literal("F"), v.literal("Other"));

// Get all patients for a practice
export const listByPractice = query({
  args: {
    practiceId: v.id("clinicPractices"),
    status: v.optional(patientStatusValidator),
    assignedClinicianId: v.optional(v.id("practiceUsers")),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("practicePatients"),
      _creationTime: v.number(),
      practiceId: v.id("clinicPractices"),
      firstName: v.string(),
      lastName: v.string(),
      preferredName: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      status: patientStatusValidator,
      assignedClinicianId: v.optional(v.id("practiceUsers")),
      assignedClinicianName: v.optional(v.string()),
      activeCase: v.optional(
        v.object({
          _id: v.id("practiceCases"),
          caseName: v.optional(v.string()),
          diagnosis: v.optional(v.string()),
          status: v.string(),
        })
      ),
      lastVisit: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and belongs to this practice
    const auth = await verifyPracticeAccess(ctx, args.practiceId);
    requirePracticePermission(auth, "patient", "read");

    let patients = await ctx.db
      .query("practicePatients")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", args.practiceId))
      .collect();

    patients = patients.filter((p) => !p.isDeleted);

    // Filter by status
    if (args.status) {
      patients = patients.filter((p) => p.status === args.status);
    }

    // Filter by assigned clinician
    if (args.assignedClinicianId) {
      patients = patients.filter(
        (p) => p.assignedClinicianId === args.assignedClinicianId
      );
    }

    // Search by name
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      patients = patients.filter(
        (p) =>
          p.firstName.toLowerCase().includes(query) ||
          p.lastName.toLowerCase().includes(query) ||
          p.preferredName?.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query)
      );
    }

    // Sort by last name
    patients.sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Apply limit
    if (args.limit) {
      patients = patients.slice(0, args.limit);
    }

    // Enrich with clinician name, active case, and last visit
    const results = [];
    for (const patient of patients) {
      let assignedClinicianName: string | undefined;
      if (patient.assignedClinicianId) {
        const clinician = await ctx.db.get(patient.assignedClinicianId);
        assignedClinicianName = clinician?.fullName;
      }

      // Get active case
      const cases = await ctx.db
        .query("practiceCases")
        .withIndex("by_patientId", (q) => q.eq("patientId", patient._id))
        .collect();
      const activeCase = cases.find(
        (c) => c.status === "active" && !c.isDeleted
      );

      // Get last visit
      const encounters = await ctx.db
        .query("practiceEncounters")
        .withIndex("by_patientId", (q) => q.eq("patientId", patient._id))
        .collect();
      const validEncounters = encounters.filter((e) => !e.isDeleted);
      validEncounters.sort((a, b) => b.encounterDatetime - a.encounterDatetime);
      const lastVisit = validEncounters[0]?.encounterDatetime;

      results.push({
        _id: patient._id,
        _creationTime: patient._creationTime,
        practiceId: patient.practiceId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        preferredName: patient.preferredName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        status: patient.status,
        assignedClinicianId: patient.assignedClinicianId,
        assignedClinicianName,
        activeCase: activeCase
          ? {
              _id: activeCase._id,
              caseName: activeCase.caseName,
              diagnosis: activeCase.diagnosis,
              status: activeCase.status,
            }
          : undefined,
        lastVisit,
        createdAt: patient.createdAt,
      });
    }

    return results;
  },
});

// Get current (active) patients sorted by most recent visit
export const listCurrentPatients = query({
  args: {
    practiceId: v.id("clinicPractices"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("practicePatients"),
      firstName: v.string(),
      lastName: v.string(),
      preferredName: v.optional(v.string()),
      status: patientStatusValidator,
      activeCase: v.optional(
        v.object({
          _id: v.id("practiceCases"),
          caseName: v.optional(v.string()),
          diagnosis: v.optional(v.string()),
        })
      ),
      lastVisitDate: v.optional(v.number()),
      lastVisitType: v.optional(v.string()),
      assignedClinicianName: v.optional(v.string()),
      nextAppointment: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and belongs to this practice
    const auth = await verifyPracticeAccess(ctx, args.practiceId);
    requirePracticePermission(auth, "patient", "read");

    // Get active patients only
    const patients = await ctx.db
      .query("practicePatients")
      .withIndex("by_practiceId_and_status", (q) =>
        q.eq("practiceId", args.practiceId).eq("status", "active")
      )
      .collect();

    const activePatients = patients.filter((p) => !p.isDeleted);

    const results = [];
    for (const patient of activePatients) {
      // Get clinician name
      let assignedClinicianName: string | undefined;
      if (patient.assignedClinicianId) {
        const clinician = await ctx.db.get(patient.assignedClinicianId);
        assignedClinicianName = clinician?.fullName;
      }

      // Get active case
      const cases = await ctx.db
        .query("practiceCases")
        .withIndex("by_patientId", (q) => q.eq("patientId", patient._id))
        .collect();
      const activeCase = cases.find(
        (c) => c.status === "active" && !c.isDeleted
      );

      // Get last visit
      const encounters = await ctx.db
        .query("practiceEncounters")
        .withIndex("by_patientId", (q) => q.eq("patientId", patient._id))
        .collect();
      const validEncounters = encounters.filter((e) => !e.isDeleted);
      validEncounters.sort((a, b) => b.encounterDatetime - a.encounterDatetime);
      const lastEncounter = validEncounters[0];

      // Get next appointment
      const now = Date.now();
      const appointments = await ctx.db
        .query("practiceAppointments")
        .withIndex("by_patientId_and_scheduledStart", (q) =>
          q.eq("patientId", patient._id).gt("scheduledStart", now)
        )
        .collect();
      const validAppointments = appointments.filter(
        (a) =>
          !a.isDeleted &&
          a.status !== "cancelled" &&
          a.status !== "completed" &&
          a.status !== "no_show"
      );
      validAppointments.sort((a, b) => a.scheduledStart - b.scheduledStart);
      const nextAppointment = validAppointments[0]?.scheduledStart;

      results.push({
        _id: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        preferredName: patient.preferredName,
        status: patient.status,
        activeCase: activeCase
          ? {
              _id: activeCase._id,
              caseName: activeCase.caseName,
              diagnosis: activeCase.diagnosis,
            }
          : undefined,
        lastVisitDate: lastEncounter?.encounterDatetime,
        lastVisitType: lastEncounter?.encounterType,
        assignedClinicianName,
        nextAppointment,
      });
    }

    // Sort by most recent visit (descending)
    results.sort((a, b) => (b.lastVisitDate ?? 0) - (a.lastVisitDate ?? 0));

    if (args.limit) {
      return results.slice(0, args.limit);
    }

    return results;
  },
});

// Get a single patient by ID with full details
export const getById = query({
  args: {
    patientId: v.id("practicePatients"),
  },
  returns: v.union(
    v.object({
      _id: v.id("practicePatients"),
      _creationTime: v.number(),
      practiceId: v.id("clinicPractices"),
      authUserId: v.optional(v.string()),
      externalEhrId: v.optional(v.string()),
      firstName: v.string(),
      lastName: v.string(),
      preferredName: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      sex: v.optional(sexValidator),
      addressStreet: v.optional(v.string()),
      addressCity: v.optional(v.string()),
      addressState: v.optional(v.string()),
      addressZip: v.optional(v.string()),
      emergencyContactName: v.optional(v.string()),
      emergencyContactPhone: v.optional(v.string()),
      emergencyContactRelationship: v.optional(v.string()),
      allergies: v.optional(v.string()),
      medications: v.optional(v.string()),
      medicalConditions: v.optional(v.string()),
      previousSurgeries: v.optional(v.string()),
      insuranceProvider: v.optional(v.string()),
      insurancePolicyNumber: v.optional(v.string()),
      insuranceGroupNumber: v.optional(v.string()),
      primaryPhysicianName: v.optional(v.string()),
      primaryPhysicianPhone: v.optional(v.string()),
      referringPhysicianName: v.optional(v.string()),
      status: patientStatusValidator,
      notes: v.optional(v.string()),
      assignedClinicianId: v.optional(v.id("practiceUsers")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "patient", "read");

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.isDeleted) return null;

    // HIPAA: Verify patient belongs to user's practice
    if (patient.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Patient belongs to another practice");
    }

    return {
      _id: patient._id,
      _creationTime: patient._creationTime,
      practiceId: patient.practiceId,
      authUserId: patient.authUserId,
      externalEhrId: patient.externalEhrId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      preferredName: patient.preferredName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex,
      addressStreet: patient.addressStreet,
      addressCity: patient.addressCity,
      addressState: patient.addressState,
      addressZip: patient.addressZip,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      emergencyContactRelationship: patient.emergencyContactRelationship,
      allergies: patient.allergies,
      medications: patient.medications,
      medicalConditions: patient.medicalConditions,
      previousSurgeries: patient.previousSurgeries,
      insuranceProvider: patient.insuranceProvider,
      insurancePolicyNumber: patient.insurancePolicyNumber,
      insuranceGroupNumber: patient.insuranceGroupNumber,
      primaryPhysicianName: patient.primaryPhysicianName,
      primaryPhysicianPhone: patient.primaryPhysicianPhone,
      referringPhysicianName: patient.referringPhysicianName,
      status: patient.status,
      notes: patient.notes,
      assignedClinicianId: patient.assignedClinicianId,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  },
});

// Create a new patient
export const create = mutation({
  args: {
    practiceId: v.id("clinicPractices"),
    firstName: v.string(),
    lastName: v.string(),
    preferredName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    sex: v.optional(sexValidator),
    addressStreet: v.optional(v.string()),
    addressCity: v.optional(v.string()),
    addressState: v.optional(v.string()),
    addressZip: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    previousSurgeries: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    primaryPhysicianName: v.optional(v.string()),
    primaryPhysicianPhone: v.optional(v.string()),
    referringPhysicianName: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedClinicianId: v.optional(v.id("practiceUsers")),
  },
  returns: v.id("practicePatients"),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and belongs to this practice
    const auth = await verifyPracticeAccess(ctx, args.practiceId);
    requirePracticePermission(auth, "patient", "create");

    const now = Date.now();
    const patientData = args;

    const patientId = await ctx.db.insert("practicePatients", {
      ...patientData,
      status: "active",
      createdByUserId: auth.userId, // Use authenticated user's ID
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });

    return patientId;
  },
});

// Update a patient
export const update = mutation({
  args: {
    patientId: v.id("practicePatients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    preferredName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    sex: v.optional(sexValidator),
    addressStreet: v.optional(v.string()),
    addressCity: v.optional(v.string()),
    addressState: v.optional(v.string()),
    addressZip: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    previousSurgeries: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    primaryPhysicianName: v.optional(v.string()),
    primaryPhysicianPhone: v.optional(v.string()),
    referringPhysicianName: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedClinicianId: v.optional(v.id("practiceUsers")),
    status: v.optional(patientStatusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and has permission
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "patient", "update");

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.isDeleted) {
      throw new Error("Patient not found");
    }

    // HIPAA: Verify patient belongs to user's practice
    if (patient.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Patient belongs to another practice");
    }

    const { patientId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(patientId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Discharge a patient (mark as inactive/discharged)
export const discharge = mutation({
  args: {
    patientId: v.id("practicePatients"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and has permission
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "patient", "update");

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.isDeleted) {
      throw new Error("Patient not found");
    }

    // HIPAA: Verify patient belongs to user's practice
    if (patient.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Patient belongs to another practice");
    }

    await ctx.db.patch(args.patientId, {
      status: "discharged",
      updatedAt: Date.now(),
    });

    // Also close any active cases
    const cases = await ctx.db
      .query("practiceCases")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    for (const c of cases) {
      if (c.status === "active" && !c.isDeleted) {
        await ctx.db.patch(c._id, {
          status: "discharged",
          dischargeDate: new Date().toISOString().split("T")[0],
          updatedAt: Date.now(),
        });
      }
    }

    return null;
  },
});

// Soft delete a patient
export const remove = mutation({
  args: {
    patientId: v.id("practicePatients"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and has delete permission
    const auth = await requirePracticeAuth(ctx);
    requirePracticePermission(auth, "patient", "delete");

    const patient = await ctx.db.get(args.patientId);
    if (!patient) {
      throw new Error("Patient not found");
    }

    // HIPAA: Verify patient belongs to user's practice
    if (patient.practiceId !== auth.practiceId) {
      throw new Error("Access denied: Patient belongs to another practice");
    }

    await ctx.db.patch(args.patientId, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Get clinic-wide injury/diagnosis statistics for pie chart
// HIPAA: Patient names removed from statistics to comply with minimum necessary standard
export const getInjuryStats = query({
  args: {
    practiceId: v.id("clinicPractices"),
  },
  returns: v.object({
    totalPatients: v.number(),
    totalCases: v.number(),
    injuryBreakdown: v.array(
      v.object({
        diagnosis: v.string(),
        count: v.number(),
        percentage: v.number(),
      })
    ),
    topInjuries: v.array(
      v.object({
        diagnosis: v.string(),
        count: v.number(),
        percentage: v.number(),
        patientCount: v.number(), // HIPAA: Replaced patient names with anonymous count
      })
    ),
  }),
  handler: async (ctx, args) => {
    // HIPAA: Verify user is authenticated and belongs to this practice
    const auth = await verifyPracticeAccess(ctx, args.practiceId);
    requirePracticePermission(auth, "patient", "read");

    // Get all cases for the practice
    const cases = await ctx.db
      .query("practiceCases")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", args.practiceId))
      .collect();

    const validCases = cases.filter((c) => !c.isDeleted && c.diagnosis);

    // Count diagnoses
    const diagnosisCounts: Record<string, { count: number; patientIds: Id<"practicePatients">[] }> = {};

    for (const c of validCases) {
      const diagnosis = c.diagnosis || "Unknown";
      if (!diagnosisCounts[diagnosis]) {
        diagnosisCounts[diagnosis] = { count: 0, patientIds: [] };
      }
      diagnosisCounts[diagnosis].count++;
      if (!diagnosisCounts[diagnosis].patientIds.includes(c.patientId)) {
        diagnosisCounts[diagnosis].patientIds.push(c.patientId);
      }
    }

    const totalCases = validCases.length;

    // Create breakdown with percentages
    const injuryBreakdown = Object.entries(diagnosisCounts)
      .map(([diagnosis, data]) => ({
        diagnosis,
        count: data.count,
        percentage: totalCases > 0 ? Math.round((data.count / totalCases) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Top 6 injuries - HIPAA: Return patient count instead of names
    const topInjuries = injuryBreakdown.slice(0, 6).map((injury) => ({
      diagnosis: injury.diagnosis,
      count: injury.count,
      percentage: injury.percentage,
      patientCount: diagnosisCounts[injury.diagnosis].patientIds.length,
    }));

    // Count unique patients
    const patients = await ctx.db
      .query("practicePatients")
      .withIndex("by_practiceId", (q) => q.eq("practiceId", args.practiceId))
      .collect();
    const totalPatients = patients.filter((p) => !p.isDeleted).length;

    return {
      totalPatients,
      totalCases,
      injuryBreakdown,
      topInjuries,
    };
  },
});
