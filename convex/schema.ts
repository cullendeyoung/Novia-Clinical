import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// =============================================================================
// HIPAA-Compliant Multi-Tenant Athletic Training Platform Schema
// All PHI (Protected Health Information) is stored with audit trails
// Every record is scoped by orgId for tenant isolation
// =============================================================================

// Role types for type safety
const roleValidator = v.union(
  v.literal("org_admin"),
  v.literal("athletic_trainer"),
  v.literal("physician"),
  v.literal("read_only"),
  v.literal("athlete")
);

// Organization status types
const orgStatusValidator = v.union(
  v.literal("pending_payment"), // Organization created but payment not completed
  v.literal("trial"),
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled")
);

// Injury status types
const injuryStatusValidator = v.union(
  v.literal("active"),
  v.literal("resolved")
);

// Return-to-play status types
const rtpStatusValidator = v.union(
  v.literal("full"),
  v.literal("limited"),
  v.literal("out")
);

// Athlete availability status (manual override by AT)
const availabilityStatusValidator = v.union(
  v.literal("healthy"),
  v.literal("limited"),
  v.literal("out")
);

// Body side types
const sideValidator = v.union(
  v.literal("L"),
  v.literal("R"),
  v.literal("Bilateral"),
  v.literal("NA")
);

// Encounter types
const encounterTypeValidator = v.union(
  v.literal("daily_care"),
  v.literal("soap_followup"),
  v.literal("initial_eval"),
  v.literal("rtp_clearance"),
  v.literal("rehab_program"),
  v.literal("other")
);

// Rehab program status types
const rehabProgramStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("paused"),
  v.literal("discontinued")
);

// Invitation status types
const invitationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("expired")
);

// Sex types
const sexValidator = v.union(
  v.literal("M"),
  v.literal("F"),
  v.literal("Other")
);

export default defineSchema({
  // =============================================================================
  // ATHLETIC TRAINING PLATFORM TABLES (New Multi-Tenant Structure)
  // =============================================================================

  // Organizations - Universities, professional teams, athletic departments
  // This is the root tenant - all data belongs to exactly one organization
  organizations: defineTable({
    name: v.string(), // "University of Vermont", "Detroit Red Wings"
    domain: v.optional(v.string()), // "uvm.edu" for email validation
    settingsJson: v.optional(v.string()), // JSON config options
    status: orgStatusValidator,
    // Note: ownerId can't reference users table due to circular dependency
    // Instead, we store the authUserId of the owner and resolve via query
    ownerAuthUserId: v.string(), // Better Auth user ID of org admin
    teamCount: v.number(), // How many teams they purchased/can create
    maxAthleticTrainersPerTeam: v.number(), // AT limit per team
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_ownerAuthUserId", ["ownerAuthUserId"])
    .index("by_domain", ["domain"])
    .index("by_status", ["status"])
    .index("by_isDeleted", ["isDeleted"]),

  // Teams - Individual sports teams within an organization
  teams: defineTable({
    orgId: v.id("organizations"),
    name: v.string(), // "Men's Basketball", "Women's Soccer"
    sport: v.string(), // "basketball", "soccer", "football", "hockey"
    season: v.optional(v.string()), // "fall", "spring", "year-round"
    inviteCode: v.string(), // Unique code for athlete self-registration
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_inviteCode", ["inviteCode"])
    .index("by_orgId_and_isActive", ["orgId", "isActive"]),

  // Users - All user types: org admins, athletic trainers, physicians, athletes
  users: defineTable({
    orgId: v.id("organizations"),
    authUserId: v.string(), // Links to Better Auth user
    email: v.string(),
    fullName: v.string(),
    role: roleValidator,
    // For ATs/physicians: their "full-time" or default team assignment
    // ATs can access ALL teams in the org but have one primary team
    fullTimeTeamId: v.optional(v.id("teams")),
    // Legacy field - kept for backward compatibility
    // For athletes: their team (single team)
    // For ATs: no longer used for access control (they have org-wide access)
    teamIds: v.array(v.id("teams")),
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    // Session management for single login enforcement
    activeSessionId: v.optional(v.string()),
    activeSessionStartedAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"])
    .index("by_orgId_and_email", ["orgId", "email"])
    .index("by_orgId_and_role", ["orgId", "role"])
    .index("by_activeSessionId", ["activeSessionId"])
    .index("by_isDeleted", ["isDeleted"]),

  // Athletes - Player/athlete records (may or may not have a user account)
  athletes: defineTable({
    orgId: v.id("organizations"),
    userId: v.optional(v.id("users")), // If they've created an account
    teamId: v.id("teams"),
    externalAthleteRef: v.optional(v.string()), // For roster sync from external systems

    // Basic Info
    firstName: v.string(),
    lastName: v.string(),
    preferredName: v.optional(v.string()), // Nickname
    email: v.optional(v.string()), // Athlete email for invitations/profile completion
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()), // ISO date string
    sex: v.optional(sexValidator),

    // Athletic Info
    classYear: v.optional(v.string()), // "Freshman", "Sophomore", "Junior", "Senior", "Graduate"
    jerseyNumber: v.optional(v.string()),
    position: v.optional(v.string()), // "Point Guard", "Goalkeeper", etc.
    heightInches: v.optional(v.number()),
    weightLbs: v.optional(v.number()),
    dominantHand: v.optional(v.union(v.literal("Left"), v.literal("Right"), v.literal("Ambidextrous"))),

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
    allergies: v.optional(v.string()), // JSON array or comma-separated
    medications: v.optional(v.string()), // Current medications
    medicalConditions: v.optional(v.string()), // Chronic conditions (asthma, diabetes, etc.)
    previousSurgeries: v.optional(v.string()),
    previousInjuries: v.optional(v.string()), // Prior to joining team

    // Insurance Info
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
    notes: v.optional(v.string()), // General notes

    // Profile completion status
    profileCompletedAt: v.optional(v.number()), // When athlete completed their profile
    inviteSentAt: v.optional(v.number()), // When invite email was sent

    // Availability status (manual override by AT)
    availabilityStatus: v.optional(availabilityStatusValidator), // "healthy", "limited", "out" - defaults to "healthy" if not set
    availabilityStatusNote: v.optional(v.string()), // Reason for status change
    availabilityStatusUpdatedAt: v.optional(v.number()), // When status was last updated
    availabilityStatusUpdatedBy: v.optional(v.id("users")), // AT who updated the status

    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_teamId", ["teamId"])
    .index("by_userId", ["userId"])
    .index("by_orgId_and_teamId", ["orgId", "teamId"])
    .index("by_lastName_firstName", ["lastName", "firstName"])
    .index("by_externalAthleteRef", ["externalAthleteRef"])
    .index("by_isDeleted", ["isDeleted"]),

  // Injuries - Injury tracking per athlete
  injuries: defineTable({
    orgId: v.id("organizations"),
    athleteId: v.id("athletes"),
    injuryDate: v.string(), // ISO date string
    bodyRegion: v.string(), // "ankle", "knee", "shoulder", "head", "back", "hip", etc.
    side: sideValidator,
    mechanism: v.optional(v.string()), // How injury occurred
    diagnosis: v.optional(v.string()), // Clinical diagnosis
    status: injuryStatusValidator,
    rtpStatus: rtpStatusValidator, // Return-to-play status
    resolvedDate: v.optional(v.string()), // When resolved
    createdByUserId: v.id("users"), // AT who logged it
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_athleteId", ["athleteId"])
    .index("by_status", ["status"])
    .index("by_athleteId_and_status", ["athleteId", "status"])
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_createdByUserId", ["createdByUserId"])
    .index("by_isDeleted", ["isDeleted"]),

  // Encounters - Clinical encounters/notes (daily care, SOAP, initial eval, etc.)
  encounters: defineTable({
    orgId: v.id("organizations"),
    athleteId: v.id("athletes"),
    injuryId: v.optional(v.id("injuries")), // Can be associated with an injury
    encounterType: encounterTypeValidator,
    encounterDatetime: v.number(), // Timestamp
    providerUserId: v.id("users"), // AT who created it
    // SOAP fields
    subjectiveText: v.optional(v.string()),
    objectiveText: v.optional(v.string()),
    assessmentText: v.optional(v.string()),
    planText: v.optional(v.string()),
    // Full rendered note
    fullNoteText: v.optional(v.string()),
    // Transcription support
    transcriptText: v.optional(v.string()),
    aiGenerated: v.boolean(),
    // Sign-off support (for physician oversight)
    signedOffByUserId: v.optional(v.id("users")),
    signedOffAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    // Archive support (for HIPAA compliance - don't delete, archive instead)
    isArchived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    archivedByUserId: v.optional(v.id("users")),
  })
    .index("by_orgId", ["orgId"])
    .index("by_athleteId", ["athleteId"])
    .index("by_injuryId", ["injuryId"])
    .index("by_providerUserId", ["providerUserId"])
    .index("by_encounterType", ["encounterType"])
    .index("by_orgId_and_athleteId", ["orgId", "athleteId"])
    .index("by_orgId_and_encounterDatetime", ["orgId", "encounterDatetime"])
    .index("by_isDeleted", ["isDeleted"])
    .index("by_athleteId_and_isArchived", ["athleteId", "isArchived"]),

  // Treatments - Treatment details for encounters
  treatments: defineTable({
    orgId: v.id("organizations"),
    encounterId: v.id("encounters"),
    modalityCodes: v.string(), // JSON array of treatment codes
    exercisesText: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    responseText: v.optional(v.string()), // Patient response to treatment
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_encounterId", ["encounterId"]),

  // Participation Status - Daily participation tracking
  participationStatus: defineTable({
    orgId: v.id("organizations"),
    athleteId: v.id("athletes"),
    date: v.string(), // ISO date string (YYYY-MM-DD)
    status: rtpStatusValidator, // full, limited, out
    reason: v.optional(v.string()), // Reason for limited/out
    setByUserId: v.id("users"), // AT who set the status
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_athleteId", ["athleteId"])
    .index("by_date", ["date"])
    .index("by_athleteId_and_date", ["athleteId", "date"])
    .index("by_orgId_and_date", ["orgId", "date"]),

  // Attachments - File attachments (images, documents, etc.)
  attachments: defineTable({
    orgId: v.id("organizations"),
    athleteId: v.optional(v.id("athletes")),
    encounterId: v.optional(v.id("encounters")),
    injuryId: v.optional(v.id("injuries")),
    storageId: v.id("_storage"), // Convex file storage
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(), // bytes
    checksumHash: v.optional(v.string()), // For integrity verification
    uploadedByUserId: v.id("users"),
    uploadedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_athleteId", ["athleteId"])
    .index("by_encounterId", ["encounterId"])
    .index("by_injuryId", ["injuryId"])
    .index("by_isDeleted", ["isDeleted"]),

  // Invitations - For inviting ATs/physicians to join
  invitations: defineTable({
    orgId: v.id("organizations"),
    teamId: v.id("teams"),
    email: v.string(),
    role: v.union(v.literal("athletic_trainer"), v.literal("physician")),
    invitedByUserId: v.id("users"),
    token: v.string(), // Unique invitation token
    status: invitationStatusValidator,
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_orgId_and_status", ["orgId", "status"]),

  // Organization Subscriptions - Billing for athletic departments
  orgSubscriptions: defineTable({
    orgId: v.id("organizations"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.string(), // "athletic_starter", "athletic_team", "athletic_department", "enterprise"
    teamCount: v.number(), // Number of teams included
    athleticTrainersPerTeam: v.number(), // ATs per team included
    status: orgStatusValidator,
    trialEndsAt: v.optional(v.number()),
    billingCycleStart: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
    .index("by_status", ["status"]),

  // Audit Logs - HIPAA compliance requirement (enhanced for multi-tenant)
  orgAuditLogs: defineTable({
    orgId: v.id("organizations"),
    userId: v.optional(v.id("users")), // Optional for pre-login events
    authUserId: v.optional(v.string()), // Better Auth ID for login events
    action: v.string(), // "login", "logout", "create", "read", "update", "delete", "export", "access_denied"
    entityType: v.string(), // "athlete", "injury", "encounter", "user", "team", etc.
    entityId: v.optional(v.string()), // ID of the affected entity
    metadataJson: v.optional(v.string()), // Additional context as JSON
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_userId", ["userId"])
    .index("by_action", ["action"])
    .index("by_entityType", ["entityType"])
    .index("by_createdAt", ["createdAt"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"]),

  // Rehab Programs - Exercise/rehabilitation programs linked to injuries
  rehabPrograms: defineTable({
    orgId: v.id("organizations"),
    athleteId: v.id("athletes"),
    injuryId: v.optional(v.id("injuries")), // Optional - can be linked to injury or be a prehab program
    isPrehab: v.optional(v.boolean()), // True if this is a preventive/prehab program without injury
    name: v.string(), // "ACL Rehab Phase 1", "Ankle Strengthening"
    description: v.optional(v.string()),
    status: rehabProgramStatusValidator,
    startDate: v.string(), // ISO date string
    targetEndDate: v.optional(v.string()), // Estimated completion date
    actualEndDate: v.optional(v.string()), // When actually completed
    notes: v.optional(v.string()), // General notes about the program
    createdByUserId: v.id("users"), // AT who created it
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_athleteId", ["athleteId"])
    .index("by_injuryId", ["injuryId"])
    .index("by_athleteId_and_status", ["athleteId", "status"])
    .index("by_createdByUserId", ["createdByUserId"])
    .index("by_isDeleted", ["isDeleted"]),

  // Rehab Exercises - Individual exercises within a rehab program
  rehabExercises: defineTable({
    orgId: v.id("organizations"),
    rehabProgramId: v.id("rehabPrograms"),
    name: v.string(), // "Quad Sets", "Heel Slides", "SLR"
    description: v.optional(v.string()), // How to perform the exercise
    sets: v.optional(v.number()), // Number of sets
    reps: v.optional(v.string()), // "10-15" or "10" - string to allow ranges
    holdSeconds: v.optional(v.number()), // For isometric exercises
    durationMinutes: v.optional(v.number()), // For timed exercises
    frequency: v.optional(v.string()), // "2x daily", "3x per week"
    equipment: v.optional(v.string()), // "Theraband", "Foam roller"
    videoUrl: v.optional(v.string()), // Link to demo video
    imageUrl: v.optional(v.string()), // Link to exercise image
    orderIndex: v.number(), // For ordering exercises in the program
    isActive: v.boolean(), // Can be toggled off without deleting
    notes: v.optional(v.string()), // Specific notes for this exercise
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_rehabProgramId", ["rehabProgramId"])
    .index("by_rehabProgramId_and_orderIndex", ["rehabProgramId", "orderIndex"]),

  // Note Templates - Custom templates for different note types
  orgNoteTemplates: defineTable({
    orgId: v.optional(v.id("organizations")), // null for system templates
    createdByUserId: v.optional(v.id("users")),
    name: v.string(),
    description: v.optional(v.string()),
    templateType: v.string(), // "daily_care", "soap", "initial_eval", "rtp_clearance", "custom"
    structure: v.string(), // JSON string defining template structure
    isSystemTemplate: v.boolean(), // Built-in vs user-created
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_createdByUserId", ["createdByUserId"])
    .index("by_templateType", ["templateType"])
    .index("by_isSystemTemplate", ["isSystemTemplate"]),

  // =============================================================================
  // CLINIC/PRACTICE TABLES (For PT, Physicians, NPs, Chiropractors, etc.)
  // Separate from athletic training - for independent clinical practices
  // =============================================================================

  // Clinic role types
  // practice_admin - Full admin access (billing, clinician management, settings)
  // clinician - Can create/manage patients and encounters
  // staff - Limited access (scheduling, basic patient info)

  // Clinician specialty types for the platform
  // physical_therapist, physician, nurse_practitioner, chiropractor, psychologist, etc.

  // Practice/Clinic - The main tenant for clinical practices
  clinicPractices: defineTable({
    name: v.string(), // "ABC Physical Therapy", "Smith Chiropractic"
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zip: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    timezone: v.string(),
    ownerAuthUserId: v.string(), // Better Auth user ID of practice owner/admin
    practiceType: v.string(), // "physical_therapy", "chiropractic", "multi_specialty"
    npiNumber: v.optional(v.string()), // National Provider Identifier
    taxId: v.optional(v.string()),
    settingsJson: v.optional(v.string()), // JSON config options
    status: v.union(
      v.literal("pending_payment"),
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_ownerAuthUserId", ["ownerAuthUserId"])
    .index("by_status", ["status"])
    .index("by_practiceType", ["practiceType"])
    .index("by_isDeleted", ["isDeleted"]),

  // Practice Users - Clinicians, admin, staff working at the practice
  practiceUsers: defineTable({
    practiceId: v.id("clinicPractices"),
    authUserId: v.string(), // Links to Better Auth user
    email: v.string(),
    fullName: v.string(),
    role: v.union(
      v.literal("practice_admin"),
      v.literal("clinician"),
      v.literal("staff")
    ),
    clinicianType: v.optional(v.string()), // "physical_therapist", "chiropractor", "physician", etc.
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    specialty: v.optional(v.string()), // "Orthopedic", "Sports", "Geriatric", etc.
    isActive: v.boolean(),
    lastLoginAt: v.optional(v.number()),
    activeSessionId: v.optional(v.string()),
    activeSessionStartedAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_practiceId", ["practiceId"])
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"])
    .index("by_practiceId_and_role", ["practiceId", "role"])
    .index("by_activeSessionId", ["activeSessionId"])
    .index("by_isDeleted", ["isDeleted"]),

  // Practice Patients - Patient records for the practice
  practicePatients: defineTable({
    practiceId: v.id("clinicPractices"),
    authUserId: v.optional(v.string()), // If patient has an account/portal access
    externalEhrId: v.optional(v.string()), // For EHR integration

    // Basic Info
    firstName: v.string(),
    lastName: v.string(),
    preferredName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    sex: v.optional(v.union(v.literal("M"), v.literal("F"), v.literal("Other"))),

    // Address
    addressStreet: v.optional(v.string()),
    addressCity: v.optional(v.string()),
    addressState: v.optional(v.string()),
    addressZip: v.optional(v.string()),

    // Emergency Contact
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),

    // Medical Info
    allergies: v.optional(v.string()),
    medications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    previousSurgeries: v.optional(v.string()),

    // Insurance
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    insurancePhone: v.optional(v.string()),
    policyHolderName: v.optional(v.string()),
    policyHolderRelationship: v.optional(v.string()),
    secondaryInsuranceProvider: v.optional(v.string()),
    secondaryInsurancePolicyNumber: v.optional(v.string()),

    // Primary Care
    primaryPhysicianName: v.optional(v.string()),
    primaryPhysicianPhone: v.optional(v.string()),
    referringPhysicianName: v.optional(v.string()),
    referringPhysicianPhone: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("discharged")
    ),
    notes: v.optional(v.string()),

    // Tracking
    assignedClinicianId: v.optional(v.id("practiceUsers")), // Primary clinician
    createdByUserId: v.id("practiceUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_practiceId", ["practiceId"])
    .index("by_authUserId", ["authUserId"])
    .index("by_assignedClinicianId", ["assignedClinicianId"])
    .index("by_lastName_firstName", ["lastName", "firstName"])
    .index("by_practiceId_and_status", ["practiceId", "status"])
    .index("by_externalEhrId", ["externalEhrId"])
    .index("by_isDeleted", ["isDeleted"]),

  // Practice Encounters - Clinical visits/notes
  practiceEncounters: defineTable({
    practiceId: v.id("clinicPractices"),
    patientId: v.id("practicePatients"),
    clinicianId: v.id("practiceUsers"), // Treating clinician
    caseId: v.optional(v.id("practiceCases")), // Links to a case/episode of care

    encounterType: v.union(
      v.literal("initial_evaluation"),
      v.literal("follow_up"),
      v.literal("re_evaluation"),
      v.literal("discharge"),
      v.literal("progress_note"),
      v.literal("daily_note"),
      v.literal("soap_note"),
      v.literal("other")
    ),
    encounterDatetime: v.number(),

    // SOAP fields
    subjectiveText: v.optional(v.string()),
    objectiveText: v.optional(v.string()),
    assessmentText: v.optional(v.string()),
    planText: v.optional(v.string()),

    // PT-specific fields
    chiefComplaint: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    icdCodes: v.optional(v.string()), // JSON array of ICD-10 codes
    cptCodes: v.optional(v.string()), // JSON array of CPT codes
    treatmentProvided: v.optional(v.string()),
    patientGoals: v.optional(v.string()),
    functionalStatus: v.optional(v.string()),

    // Transcription/AI
    transcriptText: v.optional(v.string()),
    aiGenerated: v.boolean(),

    // Sign-off
    signedOffAt: v.optional(v.number()),
    coSignedByUserId: v.optional(v.id("practiceUsers")),
    coSignedAt: v.optional(v.number()),

    // Duration
    durationMinutes: v.optional(v.number()),
    billedUnits: v.optional(v.number()),

    // Archive
    isArchived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    archivedByUserId: v.optional(v.id("practiceUsers")),

    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_practiceId", ["practiceId"])
    .index("by_patientId", ["patientId"])
    .index("by_clinicianId", ["clinicianId"])
    .index("by_caseId", ["caseId"])
    .index("by_practiceId_and_encounterDatetime", ["practiceId", "encounterDatetime"])
    .index("by_isDeleted", ["isDeleted"]),

  // Practice Cases - Episodes of care / treatment cases
  practiceCases: defineTable({
    practiceId: v.id("clinicPractices"),
    patientId: v.id("practicePatients"),
    clinicianId: v.id("practiceUsers"), // Primary treating clinician

    caseName: v.optional(v.string()), // "Low Back Pain", "Post-op ACL Rehab"
    diagnosis: v.optional(v.string()),
    icdCodes: v.optional(v.string()), // JSON array
    onsetDate: v.optional(v.string()),
    referralDate: v.optional(v.string()),
    referralSource: v.optional(v.string()), // "Dr. Smith", "Self-referred"

    status: v.union(
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("discharged"),
      v.literal("closed")
    ),

    // Goals and outcomes
    shortTermGoals: v.optional(v.string()),
    longTermGoals: v.optional(v.string()),
    dischargeNotes: v.optional(v.string()),
    dischargeDate: v.optional(v.string()),

    // Authorization
    authorizedVisits: v.optional(v.number()),
    visitsUsed: v.optional(v.number()),
    authorizationNumber: v.optional(v.string()),
    authorizationExpires: v.optional(v.string()),

    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_practiceId", ["practiceId"])
    .index("by_patientId", ["patientId"])
    .index("by_clinicianId", ["clinicianId"])
    .index("by_status", ["status"])
    .index("by_practiceId_and_status", ["practiceId", "status"])
    .index("by_isDeleted", ["isDeleted"]),

  // Practice Subscriptions - Billing for practices
  practiceSubscriptions: defineTable({
    practiceId: v.id("clinicPractices"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.string(), // "solo", "small_practice", "multi_clinician", "enterprise"
    maxClinicians: v.number(),
    maxPatients: v.optional(v.number()),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled")
    ),
    trialEndsAt: v.optional(v.number()),
    billingCycleStart: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_practiceId", ["practiceId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
    .index("by_status", ["status"]),

  // Practice Appointments - Scheduling for clinicians and patients
  practiceAppointments: defineTable({
    practiceId: v.id("clinicPractices"),
    patientId: v.id("practicePatients"),
    clinicianId: v.id("practiceUsers"), // Assigned clinician
    caseId: v.optional(v.id("practiceCases")), // Link to treatment case
    // Scheduling
    scheduledStart: v.number(), // Unix timestamp
    scheduledEnd: v.number(), // Unix timestamp
    durationMinutes: v.number(),
    // Appointment details
    appointmentType: v.union(
      v.literal("initial_evaluation"),
      v.literal("follow_up"),
      v.literal("re_evaluation"),
      v.literal("discharge"),
      v.literal("consultation"),
      v.literal("other")
    ),
    title: v.optional(v.string()), // Custom title if needed
    notes: v.optional(v.string()), // Pre-appointment notes
    // Status tracking
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("checked_in"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    // Cancellation
    cancelledAt: v.optional(v.number()),
    cancelledByUserId: v.optional(v.id("practiceUsers")),
    cancelledByPatient: v.optional(v.boolean()),
    cancellationReason: v.optional(v.string()),
    // Reminders
    reminderSentAt: v.optional(v.number()),
    // Recurring appointments
    isRecurring: v.optional(v.boolean()),
    recurringPatternJson: v.optional(v.string()), // JSON with recurrence rule
    parentAppointmentId: v.optional(v.id("practiceAppointments")), // Link to parent recurring
    // Metadata
    createdByUserId: v.id("practiceUsers"),
    createdAt: v.number(),
    updatedAt: v.number(),
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_practiceId", ["practiceId"])
    .index("by_patientId", ["patientId"])
    .index("by_clinicianId", ["clinicianId"])
    .index("by_caseId", ["caseId"])
    .index("by_scheduledStart", ["scheduledStart"])
    .index("by_status", ["status"])
    .index("by_practiceId_and_scheduledStart", ["practiceId", "scheduledStart"])
    .index("by_clinicianId_and_scheduledStart", ["clinicianId", "scheduledStart"])
    .index("by_patientId_and_scheduledStart", ["patientId", "scheduledStart"])
    .index("by_isDeleted", ["isDeleted"]),

  // Clinician Availability - Working hours and blocked time
  clinicianAvailability: defineTable({
    practiceId: v.id("clinicPractices"),
    clinicianId: v.id("practiceUsers"),
    // Type of availability entry
    entryType: v.union(
      v.literal("working_hours"), // Regular schedule
      v.literal("blocked"), // Time off, vacation, break
      v.literal("available") // Extra availability
    ),
    // Time slot
    dayOfWeek: v.optional(v.number()), // 0-6 for recurring working hours
    startTime: v.optional(v.string()), // HH:MM for recurring
    endTime: v.optional(v.string()), // HH:MM for recurring
    // Specific date override
    specificDate: v.optional(v.string()), // ISO date for one-time entries
    specificStartTime: v.optional(v.number()), // Unix timestamp
    specificEndTime: v.optional(v.number()), // Unix timestamp
    // Metadata
    reason: v.optional(v.string()), // Why blocked
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_practiceId", ["practiceId"])
    .index("by_clinicianId", ["clinicianId"])
    .index("by_clinicianId_and_dayOfWeek", ["clinicianId", "dayOfWeek"])
    .index("by_specificDate", ["specificDate"]),

  // Practice Audit Logs
  practiceAuditLogs: defineTable({
    practiceId: v.id("clinicPractices"),
    userId: v.optional(v.id("practiceUsers")),
    authUserId: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_practiceId", ["practiceId"])
    .index("by_userId", ["userId"])
    .index("by_action", ["action"])
    .index("by_createdAt", ["createdAt"])
    .index("by_practiceId_and_createdAt", ["practiceId", "createdAt"]),

  // =============================================================================
  // LEGACY TABLES (Kept for backward compatibility - will be deprecated)
  // =============================================================================

  // Clinician profiles - extends Better Auth user data (LEGACY)
  clinicians: defineTable({
    userId: v.string(), // Links to Better Auth user
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
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_practiceId", ["practiceId"])
    .index("by_activeSessionId", ["activeSessionId"]),

  // Practices - for multi-clinician accounts (LEGACY)
  practices: defineTable({
    name: v.string(),
    ownerId: v.id("clinicians"),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    timezone: v.string(),
    isActive: v.boolean(),
  }).index("by_ownerId", ["ownerId"]),

  // Subscriptions - linked to Stripe (LEGACY)
  subscriptions: defineTable({
    clinicianId: v.optional(v.id("clinicians")),
    practiceId: v.optional(v.id("practices")),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.string(),
    hasEhrIntegration: v.boolean(),
    maxClinicians: v.number(),
    maxNotesPerMonth: v.number(),
    notesUsedThisMonth: v.number(),
    billingCycleStart: v.number(),
    status: v.string(),
    trialEndsAt: v.optional(v.number()),
  })
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  // Patients - PHI storage (LEGACY)
  patients: defineTable({
    clinicianId: v.id("clinicians"),
    practiceId: v.optional(v.id("practices")),
    externalEhrId: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    insuranceProvider: v.optional(v.string()),
    insurancePolicyNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"])
    .index("by_lastName_firstName", ["lastName", "firstName"])
    .index("by_externalEhrId", ["externalEhrId"]),

  // Sessions - clinical encounters (LEGACY)
  sessions: defineTable({
    patientId: v.id("patients"),
    clinicianId: v.id("clinicians"),
    practiceId: v.optional(v.id("practices")),
    sessionType: v.string(),
    previousSessionId: v.optional(v.id("sessions")),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    status: v.string(),
    chiefComplaint: v.optional(v.string()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"])
    .index("by_status", ["status"])
    .index("by_clinicianId_and_status", ["clinicianId", "status"]),

  // Audio recordings (LEGACY)
  recordings: defineTable({
    sessionId: v.id("sessions"),
    clinicianId: v.id("clinicians"),
    storageId: v.id("_storage"),
    durationSeconds: v.number(),
    mimeType: v.string(),
    transcriptionStatus: v.string(),
    assemblyAiTranscriptId: v.optional(v.string()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_transcriptionStatus", ["transcriptionStatus"]),

  // Transcriptions (LEGACY)
  transcriptions: defineTable({
    recordingId: v.id("recordings"),
    sessionId: v.id("sessions"),
    text: v.string(),
    confidence: v.optional(v.number()),
    words: v.optional(v.string()),
    assemblyAiTranscriptId: v.string(),
  })
    .index("by_recordingId", ["recordingId"])
    .index("by_sessionId", ["sessionId"]),

  // Clinical notes (LEGACY)
  clinicalNotes: defineTable({
    sessionId: v.id("sessions"),
    patientId: v.id("patients"),
    clinicianId: v.id("clinicians"),
    transcriptionId: v.optional(v.id("transcriptions")),
    noteType: v.string(),
    subjective: v.optional(v.string()),
    objective: v.optional(v.string()),
    assessment: v.optional(v.string()),
    plan: v.optional(v.string()),
    summaryText: v.optional(v.string()),
    customText: v.optional(v.string()),
    customTemplateName: v.optional(v.string()),
    isFinalized: v.boolean(),
    finalizedAt: v.optional(v.number()),
    exportedToEhr: v.boolean(),
    exportedAt: v.optional(v.number()),
    version: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_patientId", ["patientId"])
    .index("by_clinicianId", ["clinicianId"])
    .index("by_clinicianId_and_isFinalized", ["clinicianId", "isFinalized"]),

  // Note templates (LEGACY)
  noteTemplates: defineTable({
    clinicianId: v.optional(v.id("clinicians")),
    practiceId: v.optional(v.id("practices")),
    name: v.string(),
    description: v.optional(v.string()),
    specialty: v.optional(v.string()),
    templateType: v.string(),
    structure: v.string(),
    isSystemTemplate: v.boolean(),
    isActive: v.boolean(),
  })
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"])
    .index("by_specialty", ["specialty"])
    .index("by_isSystemTemplate", ["isSystemTemplate"]),

  // Audit log (LEGACY)
  auditLogs: defineTable({
    clinicianId: v.id("clinicians"),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_clinicianId", ["clinicianId"]),

  // EHR integrations (LEGACY)
  ehrIntegrations: defineTable({
    clinicianId: v.optional(v.id("clinicians")),
    practiceId: v.optional(v.id("practices")),
    ehrProvider: v.string(),
    isActive: v.boolean(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    settings: v.optional(v.string()),
  })
    .index("by_clinicianId", ["clinicianId"])
    .index("by_practiceId", ["practiceId"]),
});
