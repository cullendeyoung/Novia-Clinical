/**
 * Authorization helpers for multi-tenant clinical practice platform
 *
 * Key principles:
 * 1. Every query/mutation must be scoped to the user's practice
 * 2. Cross-practice access is forbidden
 * 3. Role-based permissions control what actions users can perform
 * 4. All access attempts are logged for HIPAA compliance
 */

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

// =============================================================================
// Type Definitions
// =============================================================================

export type PracticeRole = "practice_admin" | "clinician" | "staff";

export type PracticeAuthContext = {
  userId: Id<"practiceUsers">;
  practiceId: Id<"clinicPractices">;
  authUserId: string;
  role: PracticeRole;
  email: string;
  fullName: string;
  clinicianType?: string;
};

// Permission actions
type Action = "create" | "read" | "update" | "delete" | "export";

// Resource types for clinical practice
type Resource =
  | "practice"
  | "practiceUser"
  | "patient"
  | "encounter"
  | "case"
  | "appointment"
  | "availability";

// =============================================================================
// Core Authentication
// =============================================================================

/**
 * Get the authenticated practice user's context including their practice
 * Returns null if not authenticated or user not found
 */
export async function getPracticeAuthContext(
  ctx: QueryCtx | MutationCtx
): Promise<PracticeAuthContext | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const practiceUser = await ctx.db
    .query("practiceUsers")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique();

  if (!practiceUser || practiceUser.isDeleted || !practiceUser.isActive) {
    return null;
  }

  return {
    userId: practiceUser._id,
    practiceId: practiceUser.practiceId,
    authUserId: practiceUser.authUserId,
    role: practiceUser.role as PracticeRole,
    email: practiceUser.email,
    fullName: practiceUser.fullName,
    clinicianType: practiceUser.clinicianType,
  };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requirePracticeAuth(
  ctx: QueryCtx | MutationCtx
): Promise<PracticeAuthContext> {
  const auth = await getPracticeAuthContext(ctx);
  if (!auth) {
    throw new Error("Authentication required");
  }
  return auth;
}

// =============================================================================
// Practice Access Control
// =============================================================================

/**
 * Verify that a record belongs to the user's practice
 * This is the core security check - prevents cross-practice access
 */
export async function verifyPracticeAccess(
  ctx: QueryCtx | MutationCtx,
  recordPracticeId: Id<"clinicPractices">
): Promise<PracticeAuthContext> {
  const auth = await requirePracticeAuth(ctx);

  if (auth.practiceId !== recordPracticeId) {
    // Log the access denial for security monitoring
    if ("db" in ctx && typeof (ctx as MutationCtx).db.insert === "function") {
      await (ctx as MutationCtx).db.insert("practiceAuditLogs", {
        practiceId: auth.practiceId,
        userId: auth.userId,
        authUserId: auth.authUserId,
        action: "access_denied",
        entityType: "cross_practice_attempt",
        metadataJson: JSON.stringify({ attemptedPracticeId: recordPracticeId }),
        createdAt: Date.now(),
      });
    }
    throw new Error("Access denied: Cross-practice access is forbidden");
  }

  return auth;
}

/**
 * Get practice for current user
 */
export async function getPractice(
  ctx: QueryCtx | MutationCtx,
  auth: PracticeAuthContext
): Promise<Doc<"clinicPractices">> {
  const practice = await ctx.db.get(auth.practiceId);
  if (!practice || practice.isDeleted) {
    throw new Error("Practice not found");
  }
  return practice;
}

// =============================================================================
// Role-Based Access Control
// =============================================================================

/**
 * Permission matrix defining what each role can do
 */
const PERMISSIONS: Record<PracticeRole, Record<Resource, Action[]>> = {
  practice_admin: {
    practice: ["read", "update"],
    practiceUser: ["create", "read", "update", "delete"],
    patient: ["create", "read", "update", "delete", "export"],
    encounter: ["create", "read", "update", "delete"],
    case: ["create", "read", "update", "delete"],
    appointment: ["create", "read", "update", "delete"],
    availability: ["create", "read", "update", "delete"],
  },
  clinician: {
    practice: ["read"],
    practiceUser: ["read"],
    patient: ["create", "read", "update"],
    encounter: ["create", "read", "update"],
    case: ["create", "read", "update"],
    appointment: ["create", "read", "update"],
    availability: ["create", "read", "update", "delete"], // Own availability
  },
  staff: {
    practice: ["read"],
    practiceUser: ["read"],
    patient: ["read", "update"], // Can update contact info, schedule
    encounter: ["read"],
    case: ["read"],
    appointment: ["create", "read", "update"], // Scheduling
    availability: ["read"],
  },
};

/**
 * Check if user has permission for an action on a resource
 */
export function hasPracticePermission(
  role: PracticeRole,
  resource: Resource,
  action: Action
): boolean {
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

/**
 * Require a specific permission - throws if not allowed
 */
export function requirePracticePermission(
  auth: PracticeAuthContext,
  resource: Resource,
  action: Action
): void {
  if (!hasPracticePermission(auth.role, resource, action)) {
    throw new Error(
      `Permission denied: ${auth.role} cannot ${action} ${resource}`
    );
  }
}

/**
 * Check if user has admin role (practice_admin)
 */
export function isPracticeAdmin(auth: PracticeAuthContext): boolean {
  return auth.role === "practice_admin";
}

/**
 * Require practice admin role
 */
export function requirePracticeAdmin(auth: PracticeAuthContext): void {
  if (!isPracticeAdmin(auth)) {
    throw new Error("This action requires practice administrator privileges");
  }
}

// =============================================================================
// Entity Ownership Verification
// =============================================================================

/**
 * Verify a patient belongs to the user's practice
 */
export async function verifyPatientInPractice(
  ctx: QueryCtx | MutationCtx,
  auth: PracticeAuthContext,
  patientId: Id<"practicePatients">
): Promise<Doc<"practicePatients">> {
  const patient = await ctx.db.get(patientId);
  if (!patient || patient.isDeleted) {
    throw new Error("Patient not found");
  }
  if (patient.practiceId !== auth.practiceId) {
    throw new Error("Access denied: Patient belongs to another practice");
  }
  return patient;
}

/**
 * Verify an appointment belongs to the user's practice
 */
export async function verifyAppointmentInPractice(
  ctx: QueryCtx | MutationCtx,
  auth: PracticeAuthContext,
  appointmentId: Id<"practiceAppointments">
): Promise<Doc<"practiceAppointments">> {
  const appointment = await ctx.db.get(appointmentId);
  if (!appointment || appointment.isDeleted) {
    throw new Error("Appointment not found");
  }
  if (appointment.practiceId !== auth.practiceId) {
    throw new Error("Access denied: Appointment belongs to another practice");
  }
  return appointment;
}

/**
 * Verify a case belongs to the user's practice
 */
export async function verifyCaseInPractice(
  ctx: QueryCtx | MutationCtx,
  auth: PracticeAuthContext,
  caseId: Id<"practiceCases">
): Promise<Doc<"practiceCases">> {
  const caseRecord = await ctx.db.get(caseId);
  if (!caseRecord || caseRecord.isDeleted) {
    throw new Error("Case not found");
  }
  if (caseRecord.practiceId !== auth.practiceId) {
    throw new Error("Access denied: Case belongs to another practice");
  }
  return caseRecord;
}

/**
 * Verify a practice user belongs to the user's practice
 */
export async function verifyPracticeUserInPractice(
  ctx: QueryCtx | MutationCtx,
  auth: PracticeAuthContext,
  targetUserId: Id<"practiceUsers">
): Promise<Doc<"practiceUsers">> {
  const targetUser = await ctx.db.get(targetUserId);
  if (!targetUser || targetUser.isDeleted) {
    throw new Error("User not found");
  }
  if (targetUser.practiceId !== auth.practiceId) {
    throw new Error("Access denied: User belongs to another practice");
  }
  return targetUser;
}

// =============================================================================
// Audit Logging
// =============================================================================

/**
 * Log an audit event for HIPAA compliance
 * Includes optional IP address and User-Agent for access tracking
 */
export async function logPracticeAuditEvent(
  ctx: MutationCtx,
  auth: PracticeAuthContext | null,
  practiceId: Id<"clinicPractices">,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
  requestContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await ctx.db.insert("practiceAuditLogs", {
    practiceId,
    userId: auth?.userId,
    authUserId: auth?.authUserId,
    action,
    entityType,
    entityId,
    metadataJson: metadata ? JSON.stringify(metadata) : undefined,
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
    createdAt: Date.now(),
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get current timestamp
 */
export function now(): number {
  return Date.now();
}
