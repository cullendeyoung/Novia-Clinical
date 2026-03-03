/**
 * Practice Users - Queries and mutations for practice/clinic users (clinicians, admin, staff)
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// =============================================================================
// VALIDATORS
// =============================================================================

const practiceRoleValidator = v.union(
  v.literal("practice_admin"),
  v.literal("clinician"),
  v.literal("staff")
);

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a practice user by their ID
 */
export const getById = query({
  args: {
    userId: v.id("practiceUsers"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("practiceUsers"),
      practiceId: v.id("clinicPractices"),
      authUserId: v.string(),
      email: v.string(),
      fullName: v.string(),
      role: practiceRoleValidator,
      clinicianType: v.optional(v.string()),
      specialty: v.optional(v.string()),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.isDeleted) {
      return null;
    }

    return {
      _id: user._id,
      practiceId: user.practiceId,
      authUserId: user.authUserId,
      email: user.email,
      fullName: user.fullName,
      role: user.role as "practice_admin" | "clinician" | "staff",
      clinicianType: user.clinicianType,
      specialty: user.specialty,
      isActive: user.isActive,
    };
  },
});

/**
 * Get the current practice user by auth user ID
 */
export const getCurrent = query({
  args: {
    authUserId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("practiceUsers"),
      practiceId: v.id("clinicPractices"),
      email: v.string(),
      fullName: v.string(),
      role: practiceRoleValidator,
      clinicianType: v.optional(v.string()),
      specialty: v.optional(v.string()),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("practiceUsers")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user || user.isDeleted || !user.isActive) {
      return null;
    }

    return {
      _id: user._id,
      practiceId: user.practiceId,
      email: user.email,
      fullName: user.fullName,
      role: user.role as "practice_admin" | "clinician" | "staff",
      clinicianType: user.clinicianType,
      specialty: user.specialty,
      isActive: user.isActive,
    };
  },
});

/**
 * List all users for a practice
 */
export const listByPractice = query({
  args: {
    practiceId: v.id("clinicPractices"),
    role: v.optional(practiceRoleValidator),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("practiceUsers"),
      email: v.string(),
      fullName: v.string(),
      role: practiceRoleValidator,
      clinicianType: v.optional(v.string()),
      specialty: v.optional(v.string()),
      isActive: v.boolean(),
      lastLoginAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    let users;

    if (args.role) {
      users = await ctx.db
        .query("practiceUsers")
        .withIndex("by_practiceId_and_role", (q) =>
          q.eq("practiceId", args.practiceId).eq("role", args.role!)
        )
        .collect();
    } else {
      users = await ctx.db
        .query("practiceUsers")
        .withIndex("by_practiceId", (q) => q.eq("practiceId", args.practiceId))
        .collect();
    }

    // Filter deleted and optionally inactive
    users = users.filter((u) => {
      if (u.isDeleted) return false;
      if (!args.includeInactive && !u.isActive) return false;
      return true;
    });

    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      fullName: u.fullName,
      role: u.role as "practice_admin" | "clinician" | "staff",
      clinicianType: u.clinicianType,
      specialty: u.specialty,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
    }));
  },
});

/**
 * List clinicians for a practice (for assignment dropdowns)
 */
export const listClinicians = query({
  args: {
    practiceId: v.id("clinicPractices"),
  },
  returns: v.array(
    v.object({
      _id: v.id("practiceUsers"),
      fullName: v.string(),
      clinicianType: v.optional(v.string()),
      specialty: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const clinicians = await ctx.db
      .query("practiceUsers")
      .withIndex("by_practiceId_and_role", (q) =>
        q.eq("practiceId", args.practiceId).eq("role", "clinician")
      )
      .collect();

    // Also include admins who may treat patients
    const admins = await ctx.db
      .query("practiceUsers")
      .withIndex("by_practiceId_and_role", (q) =>
        q.eq("practiceId", args.practiceId).eq("role", "practice_admin")
      )
      .collect();

    const allClinicians = [...clinicians, ...admins].filter(
      (u) => !u.isDeleted && u.isActive
    );

    return allClinicians.map((c) => ({
      _id: c._id,
      fullName: c.fullName,
      clinicianType: c.clinicianType,
      specialty: c.specialty,
    }));
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Update user's last login timestamp
 */
export const updateLastLogin = mutation({
  args: {
    userId: v.id("practiceUsers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.isDeleted) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Update user profile
 */
export const updateProfile = mutation({
  args: {
    userId: v.id("practiceUsers"),
    fullName: v.optional(v.string()),
    clinicianType: v.optional(v.string()),
    specialty: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.isDeleted) {
      throw new Error("User not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.fullName !== undefined) updates.fullName = args.fullName;
    if (args.clinicianType !== undefined) updates.clinicianType = args.clinicianType;
    if (args.specialty !== undefined) updates.specialty = args.specialty;
    if (args.licenseNumber !== undefined) updates.licenseNumber = args.licenseNumber;
    if (args.licenseState !== undefined) updates.licenseState = args.licenseState;
    if (args.npiNumber !== undefined) updates.npiNumber = args.npiNumber;

    await ctx.db.patch(args.userId, updates);

    return null;
  },
});

/**
 * Deactivate a user (soft disable)
 */
export const deactivate = mutation({
  args: {
    adminUserId: v.id("practiceUsers"),
    targetUserId: v.id("practiceUsers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify admin permissions
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin || admin.isDeleted || admin.role !== "practice_admin") {
      throw new Error("Admin access required");
    }

    const target = await ctx.db.get(args.targetUserId);
    if (!target || target.isDeleted) {
      throw new Error("User not found");
    }

    // Ensure same practice
    if (target.practiceId !== admin.practiceId) {
      throw new Error("Cannot modify users from other practices");
    }

    await ctx.db.patch(args.targetUserId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Log audit event
    await ctx.db.insert("practiceAuditLogs", {
      practiceId: admin.practiceId,
      userId: args.adminUserId,
      action: "user_deactivated",
      entityType: "practiceUsers",
      entityId: args.targetUserId,
      createdAt: Date.now(),
    });

    return null;
  },
});
