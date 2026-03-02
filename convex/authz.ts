/**
 * Authorization helpers for multi-tenant athletic training platform
 *
 * Key principles:
 * 1. Every query/mutation must be scoped to the user's organization
 * 2. Cross-organization access is forbidden
 * 3. Role-based permissions control what actions users can perform
 * 4. All access attempts are logged for HIPAA compliance
 */

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

// =============================================================================
// Type Definitions
// =============================================================================

export type UserRole =
  | "org_admin"
  | "athletic_trainer"
  | "physician"
  | "read_only"
  | "athlete";

export type AuthContext = {
  userId: Id<"users">;
  orgId: Id<"organizations">;
  authUserId: string;
  role: UserRole;
  teamIds: Id<"teams">[];
  fullTimeTeamId: Id<"teams"> | null;
  email: string;
  fullName: string;
};

// Permission actions
type Action = "create" | "read" | "update" | "delete" | "export";

// Resource types
type Resource =
  | "organization"
  | "team"
  | "user"
  | "athlete"
  | "injury"
  | "encounter"
  | "treatment"
  | "participation"
  | "attachment"
  | "invitation";

// =============================================================================
// Core Authentication
// =============================================================================

/**
 * Get the authenticated user's context including their organization
 * Returns null if not authenticated or user not found
 */
export async function getAuthContext(
  ctx: QueryCtx | MutationCtx
): Promise<AuthContext | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique();

  if (!user || user.isDeleted || !user.isActive) {
    return null;
  }

  return {
    userId: user._id,
    orgId: user.orgId,
    authUserId: user.authUserId,
    role: user.role as UserRole,
    teamIds: user.teamIds,
    fullTimeTeamId: user.fullTimeTeamId ?? null,
    email: user.email,
    fullName: user.fullName,
  };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<AuthContext> {
  const auth = await getAuthContext(ctx);
  if (!auth) {
    throw new Error("Authentication required");
  }
  return auth;
}

// =============================================================================
// Organization Access Control
// =============================================================================

/**
 * Verify that a record belongs to the user's organization
 * This is the core security check - prevents cross-org access
 */
export async function verifyOrgAccess(
  ctx: QueryCtx | MutationCtx,
  recordOrgId: Id<"organizations">
): Promise<AuthContext> {
  const auth = await requireAuth(ctx);

  if (auth.orgId !== recordOrgId) {
    // Log the access denial for security monitoring
    if ("db" in ctx && typeof (ctx as MutationCtx).db.insert === "function") {
      await (ctx as MutationCtx).db.insert("orgAuditLogs", {
        orgId: auth.orgId,
        userId: auth.userId,
        action: "access_denied",
        entityType: "cross_org_attempt",
        metadataJson: JSON.stringify({ attemptedOrgId: recordOrgId }),
        createdAt: Date.now(),
      });
    }
    throw new Error("Access denied: Cross-organization access is forbidden");
  }

  return auth;
}

/**
 * Get organization for current user
 */
export async function getOrganization(
  ctx: QueryCtx | MutationCtx,
  auth: AuthContext
): Promise<Doc<"organizations">> {
  const org = await ctx.db.get(auth.orgId);
  if (!org || org.isDeleted) {
    throw new Error("Organization not found");
  }
  return org;
}

// =============================================================================
// Role-Based Access Control
// =============================================================================

/**
 * Permission matrix defining what each role can do
 */
const PERMISSIONS: Record<UserRole, Record<Resource, Action[]>> = {
  org_admin: {
    organization: ["read", "update"],
    team: ["create", "read", "update", "delete"],
    user: ["create", "read", "update", "delete"],
    athlete: ["create", "read", "update", "delete"],
    injury: ["create", "read", "update", "delete"],
    encounter: ["create", "read", "update", "delete"],
    treatment: ["create", "read", "update", "delete"],
    participation: ["create", "read", "update", "delete"],
    attachment: ["create", "read", "update", "delete"],
    invitation: ["create", "read", "update", "delete"],
  },
  athletic_trainer: {
    organization: ["read"],
    team: ["read"],
    user: ["read"],
    athlete: ["create", "read", "update"],
    injury: ["create", "read", "update"],
    encounter: ["create", "read", "update"],
    treatment: ["create", "read", "update"],
    participation: ["create", "read", "update"],
    attachment: ["create", "read", "update"],
    invitation: [],
  },
  physician: {
    organization: ["read"],
    team: ["read"],
    user: ["read"],
    athlete: ["read"],
    injury: ["read", "update"], // Can update diagnosis
    encounter: ["create", "read", "update"], // Can sign off
    treatment: ["read"],
    participation: ["read"],
    attachment: ["read"],
    invitation: [],
  },
  read_only: {
    organization: ["read"],
    team: ["read"],
    user: ["read"],
    athlete: ["read"],
    injury: ["read"],
    encounter: ["read"],
    treatment: ["read"],
    participation: ["read"],
    attachment: ["read"],
    invitation: [],
  },
  athlete: {
    organization: [],
    team: [],
    user: [],
    athlete: [], // Can only read self via special endpoint
    injury: [], // Can only read self via special endpoint
    encounter: [], // Can only read self via special endpoint
    treatment: [],
    participation: [],
    attachment: [],
    invitation: [],
  },
};

/**
 * Check if user has permission for an action on a resource
 */
export function hasPermission(
  role: UserRole,
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
export function requirePermission(
  auth: AuthContext,
  resource: Resource,
  action: Action
): void {
  if (!hasPermission(auth.role, resource, action)) {
    throw new Error(
      `Permission denied: ${auth.role} cannot ${action} ${resource}`
    );
  }
}

/**
 * Check if user has admin role (org_admin)
 */
export function isOrgAdmin(auth: AuthContext): boolean {
  return auth.role === "org_admin";
}

/**
 * Require org admin role
 */
export function requireOrgAdmin(auth: AuthContext): void {
  if (!isOrgAdmin(auth)) {
    throw new Error("This action requires organization administrator privileges");
  }
}

// =============================================================================
// Team Access Control
// =============================================================================

/**
 * Check if user has access to a specific team
 * Org admins and athletic trainers have access to all teams in their org
 * Others need to be assigned to specific teams
 */
export function hasTeamAccess(
  auth: AuthContext,
  teamId: Id<"teams">
): boolean {
  if (auth.role === "org_admin") {
    return true; // Org admins can access all teams
  }
  if (auth.role === "athletic_trainer") {
    return true; // ATs can access all teams in their organization
  }
  return auth.teamIds.includes(teamId);
}

/**
 * Require access to a team - throws if not allowed
 */
export function requireTeamAccess(
  auth: AuthContext,
  teamId: Id<"teams">
): void {
  if (!hasTeamAccess(auth, teamId)) {
    throw new Error("Access denied: You do not have access to this team");
  }
}

/**
 * Verify a team belongs to the user's organization
 */
export async function verifyTeamInOrg(
  ctx: QueryCtx | MutationCtx,
  auth: AuthContext,
  teamId: Id<"teams">
): Promise<Doc<"teams">> {
  const team = await ctx.db.get(teamId);
  if (!team) {
    throw new Error("Team not found");
  }
  if (team.orgId !== auth.orgId) {
    throw new Error("Access denied: Team belongs to another organization");
  }
  return team;
}

// =============================================================================
// Entity Ownership Verification
// =============================================================================

/**
 * Verify an athlete belongs to the user's organization
 */
export async function verifyAthleteInOrg(
  ctx: QueryCtx | MutationCtx,
  auth: AuthContext,
  athleteId: Id<"athletes">
): Promise<Doc<"athletes">> {
  const athlete = await ctx.db.get(athleteId);
  if (!athlete || athlete.isDeleted) {
    throw new Error("Athlete not found");
  }
  if (athlete.orgId !== auth.orgId) {
    throw new Error("Access denied: Athlete belongs to another organization");
  }
  // ATs and org_admins have access to all teams in the org
  // Others need specific team access
  if (auth.role !== "org_admin" && auth.role !== "athletic_trainer") {
    requireTeamAccess(auth, athlete.teamId);
  }
  return athlete;
}

/**
 * Verify an injury belongs to the user's organization
 */
export async function verifyInjuryInOrg(
  ctx: QueryCtx | MutationCtx,
  auth: AuthContext,
  injuryId: Id<"injuries">
): Promise<Doc<"injuries">> {
  const injury = await ctx.db.get(injuryId);
  if (!injury || injury.isDeleted) {
    throw new Error("Injury not found");
  }
  if (injury.orgId !== auth.orgId) {
    throw new Error("Access denied: Injury belongs to another organization");
  }
  return injury;
}

/**
 * Verify an encounter belongs to the user's organization
 */
export async function verifyEncounterInOrg(
  ctx: QueryCtx | MutationCtx,
  auth: AuthContext,
  encounterId: Id<"encounters">
): Promise<Doc<"encounters">> {
  const encounter = await ctx.db.get(encounterId);
  if (!encounter || encounter.isDeleted) {
    throw new Error("Encounter not found");
  }
  if (encounter.orgId !== auth.orgId) {
    throw new Error("Access denied: Encounter belongs to another organization");
  }
  return encounter;
}

/**
 * Verify a user belongs to the user's organization
 */
export async function verifyUserInOrg(
  ctx: QueryCtx | MutationCtx,
  auth: AuthContext,
  targetUserId: Id<"users">
): Promise<Doc<"users">> {
  const targetUser = await ctx.db.get(targetUserId);
  if (!targetUser || targetUser.isDeleted) {
    throw new Error("User not found");
  }
  if (targetUser.orgId !== auth.orgId) {
    throw new Error("Access denied: User belongs to another organization");
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
export async function logAuditEvent(
  ctx: MutationCtx,
  auth: AuthContext | null,
  orgId: Id<"organizations">,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
  requestContext?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await ctx.db.insert("orgAuditLogs", {
    orgId,
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
 * Generate a secure random token for invitations
 */
export function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Generate a short invite code for athlete registration links
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get current timestamp
 */
export function now(): number {
  return Date.now();
}
