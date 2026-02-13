import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// HIPAA-Compliant Clinical Documentation Platform Schema
// All PHI (Protected Health Information) is stored with audit trails

export default defineSchema({
  // Clinician profiles - extends Better Auth user data
  clinicians: defineTable({
    userId: v.string(), // Links to Better Auth user
    fullName: v.string(),
    email: v.string(),
    specialty: v.string(), // physician, physical_therapist, chiropractor, dentist, psychologist, trainer, athletic_trainer, other
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    practiceId: v.optional(v.id("practices")), // null for solo practitioners
    role: v.string(), // owner, admin, clinician
    isActive: v.boolean(),
    hasExistingEhr: v.boolean(), // true = EHR integration, false = standalone
    practiceSize: v.string(), // solo, small, medium, large
    // Session management for single login enforcement
    activeSessionId: v.optional(v.string()), // Current active session token
    activeSessionStartedAt: v.optional(v.number()), // When current session started
    lastActiveAt: v.optional(v.number()), // Last activity timestamp
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_practiceId", ["practiceId"])
    .index("by_activeSessionId", ["activeSessionId"]),

  // Practices - for multi-clinician accounts
  practices: defineTable({
    name: v.string(),
    ownerId: v.id("clinicians"),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    timezone: v.string(),
    isActive: v.boolean(),
  }).index("by_ownerId", ["ownerId"]),

  // Subscriptions - linked to Stripe
  subscriptions: defineTable({
    clinicianId: v.optional(v.id("clinicians")), // For solo plans
    practiceId: v.optional(v.id("practices")), // For team/practice plans
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.string(), // solo_ehr, solo_standalone, team_ehr, team_standalone, practice_ehr, practice_standalone, enterprise
    hasEhrIntegration: v.boolean(), // Affects pricing
    maxClinicians: v.number(), // 1, 5, 10, or -1 for unlimited
    maxNotesPerMonth: v.number(), // 100, 500, -1 for unlimited
    notesUsedThisMonth: v.number(),
    billingCycleStart: v.number(), // Timestamp
    status: v.string(), // active, canceled, past_due, trialing
    trialEndsAt: v.optional(v.number()),
  })
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  // Patients - PHI storage
  patients: defineTable({
    clinicianId: v.id("clinicians"), // Primary clinician
    practiceId: v.optional(v.id("practices")), // If part of a practice
    externalEhrId: v.optional(v.string()), // ID from integrated EHR
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()), // ISO date string
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    notes: v.optional(v.string()), // General notes about patient
    isActive: v.boolean(),
  })
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"])
    .index("by_lastName_firstName", ["lastName", "firstName"])
    .index("by_externalEhrId", ["externalEhrId"]),

  // Sessions - clinical encounters
  sessions: defineTable({
    patientId: v.id("patients"),
    clinicianId: v.id("clinicians"),
    practiceId: v.optional(v.id("practices")),
    sessionType: v.string(), // initial, follow_up, check_up, consultation, other
    previousSessionId: v.optional(v.id("sessions")), // For "build from previous"
    scheduledAt: v.optional(v.number()), // Timestamp
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    status: v.string(), // scheduled, in_progress, pending_review, completed, canceled
    chiefComplaint: v.optional(v.string()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"])
    .index("by_status", ["status"])
    .index("by_clinicianId_and_status", ["clinicianId", "status"]),

  // Audio recordings - stored securely
  recordings: defineTable({
    sessionId: v.id("sessions"),
    clinicianId: v.id("clinicians"),
    storageId: v.id("_storage"), // Convex file storage
    durationSeconds: v.number(),
    mimeType: v.string(),
    transcriptionStatus: v.string(), // pending, processing, completed, failed
    assemblyAiTranscriptId: v.optional(v.string()), // AssemblyAI reference
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_transcriptionStatus", ["transcriptionStatus"]),

  // Transcriptions - from AssemblyAI
  transcriptions: defineTable({
    recordingId: v.id("recordings"),
    sessionId: v.id("sessions"),
    text: v.string(), // Full transcription text
    confidence: v.optional(v.number()), // Overall confidence score
    words: v.optional(v.string()), // JSON string of word-level data with timestamps
    assemblyAiTranscriptId: v.string(),
  })
    .index("by_recordingId", ["recordingId"])
    .index("by_sessionId", ["sessionId"]),

  // Clinical notes - generated from transcriptions
  clinicalNotes: defineTable({
    sessionId: v.id("sessions"),
    patientId: v.id("patients"),
    clinicianId: v.id("clinicians"),
    transcriptionId: v.optional(v.id("transcriptions")),
    noteType: v.string(), // soap, summary, custom
    // SOAP fields
    subjective: v.optional(v.string()),
    objective: v.optional(v.string()),
    assessment: v.optional(v.string()),
    plan: v.optional(v.string()),
    // Summary field
    summaryText: v.optional(v.string()),
    // Custom note field
    customText: v.optional(v.string()),
    customTemplateName: v.optional(v.string()),
    // Metadata
    isFinalized: v.boolean(), // Once finalized, creates audit trail for edits
    finalizedAt: v.optional(v.number()),
    exportedToEhr: v.boolean(),
    exportedAt: v.optional(v.number()),
    version: v.number(), // For versioning edits
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_patientId", ["patientId"])
    .index("by_clinicianId", ["clinicianId"])
    .index("by_clinicianId_and_isFinalized", ["clinicianId", "isFinalized"]),

  // Note templates - custom templates for different specialties
  noteTemplates: defineTable({
    clinicianId: v.optional(v.id("clinicians")), // null for system templates
    practiceId: v.optional(v.id("practices")),
    name: v.string(),
    description: v.optional(v.string()),
    specialty: v.optional(v.string()), // If specialty-specific
    templateType: v.string(), // soap, summary, custom
    structure: v.string(), // JSON string defining template structure
    isSystemTemplate: v.boolean(), // Built-in vs user-created
    isActive: v.boolean(),
  })
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"])
    .index("by_specialty", ["specialty"])
    .index("by_isSystemTemplate", ["isSystemTemplate"]),

  // Audit log - HIPAA compliance requirement
  auditLogs: defineTable({
    clinicianId: v.id("clinicians"),
    action: v.string(), // view, create, update, delete, export, access_attempt
    resourceType: v.string(), // patient, session, note, recording, transcription
    resourceId: v.string(), // ID of the affected resource
    details: v.optional(v.string()), // JSON string with additional context
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_clinicianId", ["clinicianId"]),

  // EHR integrations - configuration per practice/clinician
  ehrIntegrations: defineTable({
    clinicianId: v.optional(v.id("clinicians")),
    practiceId: v.optional(v.id("practices")),
    ehrProvider: v.string(), // epic, cerner, athena, drchrono, etc.
    isActive: v.boolean(),
    // OAuth tokens stored encrypted
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    // Configuration
    settings: v.optional(v.string()), // JSON string for provider-specific settings
  })
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"]),
});
