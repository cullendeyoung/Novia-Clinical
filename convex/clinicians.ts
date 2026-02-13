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

// Get clinician by user ID
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
