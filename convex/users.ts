/**
 * User management functions
 *
 * Users belong to organizations and have roles that determine their permissions.
 * Includes session management for single-login enforcement.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthContext,
  requireAuth,
  requireOrgAdmin,
  verifyUserInOrg,
  verifyTeamInOrg,
  logAuditEvent,
  now,
} from "./authz";
import type { UserRole } from "./authz";

// Role validator for function arguments
const roleValidator = v.union(
  v.literal("org_admin"),
  v.literal("athletic_trainer"),
  v.literal("physician"),
  v.literal("read_only"),
  v.literal("athlete")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get the current user
 */
export const getCurrent = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      orgId: v.id("organizations"),
      authUserId: v.string(),
      email: v.string(),
      fullName: v.string(),
      role: roleValidator,
      teamIds: v.array(v.id("teams")),
      fullTimeTeamId: v.optional(v.id("teams")),
      isActive: v.boolean(),
      lastLoginAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    if (!auth) return null;

    const user = await ctx.db.get(auth.userId);
    if (!user || user.isDeleted) return null;

    // Return without session fields for security
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      orgId: user.orgId,
      authUserId: user.authUserId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      teamIds: user.teamIds,
      fullTimeTeamId: user.fullTimeTeamId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

/**
 * Get user by auth user ID (for login flow)
 */
export const getByAuthUserId = query({
  args: { authUserId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      orgId: v.id("organizations"),
      email: v.string(),
      fullName: v.string(),
      role: roleValidator,
      teamIds: v.array(v.id("teams")),
      isActive: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user || user.isDeleted || !user.isActive) return null;

    return {
      _id: user._id,
      orgId: user.orgId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      teamIds: user.teamIds,
      isActive: user.isActive,
    };
  },
});

/**
 * List all users in the organization (org admin only)
 */
export const list = query({
  args: {
    role: v.optional(roleValidator),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      fullName: v.string(),
      role: roleValidator,
      teamIds: v.array(v.id("teams")),
      fullTimeTeamId: v.optional(v.id("teams")),
      isActive: v.boolean(),
      lastLoginAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    // Only org admins can list all users
    if (auth.role !== "org_admin") {
      // Non-admins can only see users on their teams
      const users = await ctx.db
        .query("users")
        .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
        .collect();

      return users
        .filter((u) => {
          if (u.isDeleted) return false;
          if (!args.includeInactive && !u.isActive) return false;
          if (args.role && u.role !== args.role) return false;
          // Check if user shares any team with current user
          return u.teamIds.some((tid) => auth.teamIds.includes(tid));
        })
        .map((u) => ({
          _id: u._id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          teamIds: u.teamIds,
          fullTimeTeamId: u.fullTimeTeamId,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        }));
    }

    // Org admins see all users
    let users;
    const roleFilter = args.role;
    if (roleFilter) {
      users = await ctx.db
        .query("users")
        .withIndex("by_orgId_and_role", (q) =>
          q.eq("orgId", auth.orgId).eq("role", roleFilter)
        )
        .collect();
    } else {
      users = await ctx.db
        .query("users")
        .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
        .collect();
    }

    return users
      .filter((u) => {
        if (u.isDeleted) return false;
        if (!args.includeInactive && !u.isActive) return false;
        return true;
      })
      .map((u) => ({
        _id: u._id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        teamIds: u.teamIds,
        fullTimeTeamId: u.fullTimeTeamId,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      }));
  },
});

/**
 * Get users for a specific team
 */
export const getByTeam = query({
  args: { teamId: v.id("teams") },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      fullName: v.string(),
      role: roleValidator,
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    await verifyTeamInOrg(ctx, auth, args.teamId);

    const users = await ctx.db
      .query("users")
      .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
      .collect();

    return users
      .filter(
        (u) =>
          !u.isDeleted &&
          u.isActive &&
          u.teamIds.includes(args.teamId)
      )
      .map((u) => ({
        _id: u._id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        isActive: u.isActive,
      }));
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a user (called during invitation acceptance or athlete registration)
 * Note: For org admin creation, use organizations.create
 */
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    authUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    role: roleValidator,
    teamIds: v.array(v.id("teams")),
    fullTimeTeamId: v.optional(v.id("teams")),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Verify org exists
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) {
      throw new Error("Organization not found");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (existingUser && !existingUser.isDeleted) {
      return existingUser._id;
    }

    // Verify teams belong to the org
    for (const teamId of args.teamIds) {
      const team = await ctx.db.get(teamId);
      if (!team || team.orgId !== args.orgId) {
        throw new Error("Invalid team");
      }
    }

    // Verify fullTimeTeamId belongs to the org if provided
    if (args.fullTimeTeamId) {
      const fullTimeTeam = await ctx.db.get(args.fullTimeTeamId);
      if (!fullTimeTeam || fullTimeTeam.orgId !== args.orgId) {
        throw new Error("Invalid full-time team");
      }
    }

    const timestamp = now();

    const userId = await ctx.db.insert("users", {
      orgId: args.orgId,
      authUserId: args.authUserId,
      email: args.email,
      fullName: args.fullName,
      role: args.role,
      teamIds: args.teamIds,
      fullTimeTeamId: args.fullTimeTeamId,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Log the creation
    await ctx.db.insert("orgAuditLogs", {
      orgId: args.orgId,
      userId,
      authUserId: args.authUserId,
      action: "create",
      entityType: "user",
      entityId: userId,
      metadataJson: JSON.stringify({
        email: args.email,
        role: args.role,
      }),
      createdAt: timestamp,
    });

    return userId;
  },
});

/**
 * Update user profile (self or org admin)
 */
export const update = mutation({
  args: {
    userId: v.optional(v.id("users")), // If not provided, updates self
    fullName: v.optional(v.string()),
    teamIds: v.optional(v.array(v.id("teams"))), // Only org admin can change
    fullTimeTeamId: v.optional(v.id("teams")), // Only org admin can change - AT's primary team
    role: v.optional(roleValidator), // Only org admin can change
    isActive: v.optional(v.boolean()), // Only org admin can change
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const targetUserId = args.userId || auth.userId;
    const isSelf = targetUserId === auth.userId;

    // If updating another user, must be org admin
    if (!isSelf) {
      requireOrgAdmin(auth);
    }

    const targetUser = await verifyUserInOrg(ctx, auth, targetUserId);

    const updates: Partial<{
      fullName: string;
      teamIds: typeof args.teamIds;
      fullTimeTeamId: typeof args.fullTimeTeamId;
      role: UserRole;
      isActive: boolean;
      updatedAt: number;
    }> = {
      updatedAt: now(),
    };

    // Self can only update their name
    if (args.fullName !== undefined) updates.fullName = args.fullName;

    // Only org admin can update these fields
    if (auth.role === "org_admin") {
      if (args.teamIds !== undefined) {
        // Verify all teams belong to org
        for (const teamId of args.teamIds) {
          await verifyTeamInOrg(ctx, auth, teamId);
        }
        updates.teamIds = args.teamIds;
      }
      if (args.fullTimeTeamId !== undefined) {
        // Verify the full-time team belongs to org
        await verifyTeamInOrg(ctx, auth, args.fullTimeTeamId);
        updates.fullTimeTeamId = args.fullTimeTeamId;
      }
      if (args.role !== undefined) {
        // Can't demote the last org admin
        if (targetUser.role === "org_admin" && args.role !== "org_admin") {
          const orgAdmins = await ctx.db
            .query("users")
            .withIndex("by_orgId_and_role", (q) =>
              q.eq("orgId", auth.orgId).eq("role", "org_admin")
            )
            .collect();
          const activeAdmins = orgAdmins.filter(
            (u) => u.isActive && !u.isDeleted
          );
          if (activeAdmins.length <= 1) {
            throw new Error("Cannot remove the last organization administrator");
          }
        }
        updates.role = args.role;
      }
      if (args.isActive !== undefined) {
        // Can't deactivate the last org admin
        if (targetUser.role === "org_admin" && !args.isActive) {
          const orgAdmins = await ctx.db
            .query("users")
            .withIndex("by_orgId_and_role", (q) =>
              q.eq("orgId", auth.orgId).eq("role", "org_admin")
            )
            .collect();
          const activeAdmins = orgAdmins.filter(
            (u) => u.isActive && !u.isDeleted
          );
          if (activeAdmins.length <= 1) {
            throw new Error("Cannot deactivate the last organization administrator");
          }
        }
        updates.isActive = args.isActive;
      }
    }

    await ctx.db.patch(targetUserId, updates);

    // Log the update
    await logAuditEvent(ctx, auth, auth.orgId, "update", "user", targetUserId, {
      targetEmail: targetUser.email,
      updates: Object.keys(updates),
    });

    return true;
  },
});

/**
 * Soft delete a user (org admin only)
 */
export const remove = mutation({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    // Can't delete yourself
    if (args.userId === auth.userId) {
      throw new Error("Cannot delete your own account");
    }

    const targetUser = await verifyUserInOrg(ctx, auth, args.userId);

    // Can't delete the last org admin
    if (targetUser.role === "org_admin") {
      const orgAdmins = await ctx.db
        .query("users")
        .withIndex("by_orgId_and_role", (q) =>
          q.eq("orgId", auth.orgId).eq("role", "org_admin")
        )
        .collect();
      const activeAdmins = orgAdmins.filter((u) => u.isActive && !u.isDeleted);
      if (activeAdmins.length <= 1) {
        throw new Error("Cannot delete the last organization administrator");
      }
    }

    const timestamp = now();

    await ctx.db.patch(args.userId, {
      isDeleted: true,
      deletedAt: timestamp,
      isActive: false,
      updatedAt: timestamp,
    });

    // Log the deletion
    await logAuditEvent(ctx, auth, auth.orgId, "delete", "user", args.userId, {
      targetEmail: targetUser.email,
    });

    return true;
  },
});

// =============================================================================
// Session Management
// =============================================================================

/**
 * Start a new session (enforces single login)
 */
export const startSession = mutation({
  args: {
    authUserId: v.string(),
    sessionId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    existingSession: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user || user.isDeleted || !user.isActive) {
      return {
        success: false,
        existingSession: false,
        message: "User not found or inactive",
      };
    }

    const timestamp = now();

    // Check for existing active session
    if (user.activeSessionId && user.activeSessionId !== args.sessionId) {
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes
      const lastActive = user.lastActiveAt || user.activeSessionStartedAt || 0;

      if (timestamp - lastActive < sessionTimeout) {
        return {
          success: false,
          existingSession: true,
          message: "Another session is active. Please log out from the other device.",
        };
      }
    }

    // Set new session
    await ctx.db.patch(user._id, {
      activeSessionId: args.sessionId,
      activeSessionStartedAt: timestamp,
      lastActiveAt: timestamp,
      lastLoginAt: timestamp,
      updatedAt: timestamp,
    });

    // Log the login
    await ctx.db.insert("orgAuditLogs", {
      orgId: user.orgId,
      userId: user._id,
      authUserId: args.authUserId,
      action: "login",
      entityType: "session",
      metadataJson: JSON.stringify({ sessionId: args.sessionId }),
      createdAt: timestamp,
    });

    return {
      success: true,
      existingSession: false,
      message: "Session started",
    };
  },
});

/**
 * Validate current session
 */
export const validateSession = query({
  args: {
    authUserId: v.string(),
    sessionId: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user || user.isDeleted || !user.isActive) {
      return { valid: false, reason: "User not found or inactive" };
    }

    if (user.activeSessionId !== args.sessionId) {
      return { valid: false, reason: "Session invalid or expired" };
    }

    return { valid: true };
  },
});

/**
 * Heartbeat to keep session alive
 */
export const heartbeat = mutation({
  args: {
    authUserId: v.string(),
    sessionId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user || user.activeSessionId !== args.sessionId) {
      return false;
    }

    await ctx.db.patch(user._id, {
      lastActiveAt: now(),
    });

    return true;
  },
});

/**
 * End session (logout)
 */
export const endSession = mutation({
  args: {
    authUserId: v.string(),
    sessionId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) return false;

    if (user.activeSessionId === args.sessionId) {
      await ctx.db.patch(user._id, {
        activeSessionId: undefined,
        activeSessionStartedAt: undefined,
        lastActiveAt: undefined,
        updatedAt: now(),
      });

      // Log the logout
      await ctx.db.insert("orgAuditLogs", {
        orgId: user.orgId,
        userId: user._id,
        authUserId: args.authUserId,
        action: "logout",
        entityType: "session",
        metadataJson: JSON.stringify({ sessionId: args.sessionId }),
        createdAt: now(),
      });
    }

    return true;
  },
});

/**
 * Force end all sessions (admin action)
 */
export const forceEndAllSessions = mutation({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const targetUser = await verifyUserInOrg(ctx, auth, args.userId);

    await ctx.db.patch(args.userId, {
      activeSessionId: undefined,
      activeSessionStartedAt: undefined,
      lastActiveAt: undefined,
      updatedAt: now(),
    });

    // Log the action
    await logAuditEvent(
      ctx,
      auth,
      auth.orgId,
      "admin_action",
      "force_logout",
      args.userId,
      {
        targetEmail: targetUser.email,
      }
    );

    return true;
  },
});
