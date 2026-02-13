import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Specialty options for clinicians
export const SPECIALTIES = [
  { value: "physician", label: "Physician / MD / DO" },
  { value: "physical_therapist", label: "Physical Therapist" },
  { value: "chiropractor", label: "Chiropractor" },
  { value: "dentist", label: "Dentist" },
  { value: "psychologist", label: "Psychologist" },
  { value: "psychiatrist", label: "Psychiatrist" },
  { value: "nurse_practitioner", label: "Nurse Practitioner" },
  { value: "physician_assistant", label: "Physician Assistant" },
  { value: "athletic_trainer", label: "Athletic Trainer" },
  { value: "personal_trainer", label: "Personal Trainer / Coach" },
  { value: "occupational_therapist", label: "Occupational Therapist" },
  { value: "speech_therapist", label: "Speech-Language Pathologist" },
  { value: "massage_therapist", label: "Massage Therapist" },
  { value: "acupuncturist", label: "Acupuncturist" },
  { value: "other", label: "Other Healthcare Provider" },
] as const;

// Practice size options
export const PRACTICE_SIZES = [
  { value: "solo", label: "Solo Practice (1 clinician)" },
  { value: "small", label: "Small Practice (2-5 clinicians)" },
  { value: "medium", label: "Medium Practice (6-10 clinicians)" },
  { value: "large", label: "Large Practice (11+ clinicians)" },
] as const;

// Create clinician profile after registration
export const create = mutation({
  args: {
    userId: v.string(),
    fullName: v.string(),
    email: v.string(),
    specialty: v.string(),
    practiceSize: v.string(),
    hasExistingEhr: v.boolean(),
  },
  returns: v.id("clinicians"),
  handler: async (ctx, args) => {
    // Check if clinician already exists for this user
    const existing = await ctx.db
      .query("clinicians")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create the clinician profile
    const clinicianId = await ctx.db.insert("clinicians", {
      userId: args.userId,
      fullName: args.fullName,
      email: args.email,
      specialty: args.specialty,
      practiceSize: args.practiceSize,
      hasExistingEhr: args.hasExistingEhr,
      role: "owner", // First clinician is always owner
      isActive: true,
    });

    // Log the creation for HIPAA audit
    await ctx.db.insert("auditLogs", {
      clinicianId,
      action: "create",
      resourceType: "clinician",
      resourceId: clinicianId,
      details: JSON.stringify({
        specialty: args.specialty,
        practiceSize: args.practiceSize,
        hasExistingEhr: args.hasExistingEhr,
      }),
    });

    return clinicianId;
  },
});

// Get clinician by user ID with full details
export const getByUserId = query({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("clinicians"),
      _creationTime: v.number(),
      userId: v.string(),
      fullName: v.string(),
      email: v.string(),
      specialty: v.string(),
      licenseNumber: v.optional(v.string()),
      licenseState: v.optional(v.string()),
      practiceId: v.optional(v.id("practices")),
      role: v.string(),
      isActive: v.boolean(),
      hasExistingEhr: v.boolean(),
      practiceSize: v.string(),
      activeSessionId: v.optional(v.string()),
      activeSessionStartedAt: v.optional(v.number()),
      lastActiveAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clinicians")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Start a new session - enforces single login
export const startSession = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    existingSession: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const clinician = await ctx.db
      .query("clinicians")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!clinician) {
      return {
        success: false,
        existingSession: false,
        message: "Clinician not found",
      };
    }

    const now = Date.now();

    // Check if there's an existing active session
    if (clinician.activeSessionId && clinician.activeSessionId !== args.sessionId) {
      // Session exists from another device/browser
      // Check if it's stale (no activity for 30 minutes)
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes
      const lastActive = clinician.lastActiveAt || clinician.activeSessionStartedAt || 0;

      if (now - lastActive < sessionTimeout) {
        // Active session exists - deny new login
        return {
          success: false,
          existingSession: true,
          message: "Another session is currently active. Please log out from the other device first.",
        };
      }
      // Session is stale, allow override
    }

    // Set new active session
    await ctx.db.patch(clinician._id, {
      activeSessionId: args.sessionId,
      activeSessionStartedAt: now,
      lastActiveAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      clinicianId: clinician._id,
      action: "session_start",
      resourceType: "clinician",
      resourceId: clinician._id,
      details: JSON.stringify({ sessionId: args.sessionId }),
    });

    return {
      success: true,
      existingSession: false,
      message: "Session started successfully",
    };
  },
});

// Validate current session
export const validateSession = query({
  args: {
    userId: v.string(),
    sessionId: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const clinician = await ctx.db
      .query("clinicians")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!clinician) {
      return { valid: false, reason: "Clinician not found" };
    }

    if (clinician.activeSessionId !== args.sessionId) {
      return { valid: false, reason: "Session invalid or expired" };
    }

    return { valid: true };
  },
});

// Update last active timestamp (call periodically from client)
export const heartbeat = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const clinician = await ctx.db
      .query("clinicians")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!clinician || clinician.activeSessionId !== args.sessionId) {
      return false;
    }

    await ctx.db.patch(clinician._id, {
      lastActiveAt: Date.now(),
    });

    return true;
  },
});

// End session (logout)
export const endSession = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const clinician = await ctx.db
      .query("clinicians")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!clinician) {
      return false;
    }

    // Only clear if it's the current session
    if (clinician.activeSessionId === args.sessionId) {
      await ctx.db.patch(clinician._id, {
        activeSessionId: undefined,
        activeSessionStartedAt: undefined,
        lastActiveAt: undefined,
      });

      // Audit log
      await ctx.db.insert("auditLogs", {
        clinicianId: clinician._id,
        action: "session_end",
        resourceType: "clinician",
        resourceId: clinician._id,
        details: JSON.stringify({ sessionId: args.sessionId }),
      });
    }

    return true;
  },
});

// Force end all sessions (admin action)
export const forceEndAllSessions = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const clinician = await ctx.db
      .query("clinicians")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!clinician) {
      return false;
    }

    await ctx.db.patch(clinician._id, {
      activeSessionId: undefined,
      activeSessionStartedAt: undefined,
      lastActiveAt: undefined,
    });

    return true;
  },
});
