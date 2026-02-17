/**
 * Organization management functions
 *
 * Organizations are the root tenant in the multi-tenant system.
 * All data belongs to exactly one organization.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getAuthContext,
  requireAuth,
  requireOrgAdmin,
  logAuditEvent,
  now,
} from "./authz";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get the current user's organization
 */
export const getCurrent = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      domain: v.optional(v.string()),
      settingsJson: v.optional(v.string()),
      status: v.union(
        v.literal("pending_payment"),
        v.literal("trial"),
        v.literal("active"),
        v.literal("past_due"),
        v.literal("canceled")
      ),
      ownerAuthUserId: v.string(),
      teamCount: v.number(),
      maxAthleticTrainersPerTeam: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    if (!auth) return null;

    const org = await ctx.db.get(auth.orgId);
    if (!org || org.isDeleted) return null;

    return org;
  },
});

/**
 * Get organization by ID (admin only, or for user's own org)
 */
export const getById = query({
  args: { orgId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      domain: v.optional(v.string()),
      settingsJson: v.optional(v.string()),
      status: v.union(
        v.literal("pending_payment"),
        v.literal("trial"),
        v.literal("active"),
        v.literal("past_due"),
        v.literal("canceled")
      ),
      ownerAuthUserId: v.string(),
      teamCount: v.number(),
      maxAthleticTrainersPerTeam: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const auth = await getAuthContext(ctx);
    if (!auth) return null;

    // Can only view own organization
    if (auth.orgId !== args.orgId) return null;

    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) return null;

    return org;
  },
});

/**
 * Get organization statistics for dashboard
 */
export const getStats = query({
  args: {},
  returns: v.union(
    v.object({
      teamCount: v.number(),
      athleteCount: v.number(),
      athleticTrainerCount: v.number(),
      activeInjuryCount: v.number(),
      todayEncounterCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const auth = await getAuthContext(ctx);
    if (!auth) return null;

    // Count teams
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
      .collect();
    const teamCount = teams.filter((t) => t.isActive).length;

    // Count athletes
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_orgId", (q) => q.eq("orgId", auth.orgId))
      .collect();
    const athleteCount = athletes.filter((a) => a.isActive && !a.isDeleted)
      .length;

    // Count athletic trainers
    const users = await ctx.db
      .query("users")
      .withIndex("by_orgId_and_role", (q) =>
        q.eq("orgId", auth.orgId).eq("role", "athletic_trainer")
      )
      .collect();
    const athleticTrainerCount = users.filter((u) => u.isActive && !u.isDeleted)
      .length;

    // Count active injuries
    const injuries = await ctx.db
      .query("injuries")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", auth.orgId).eq("status", "active")
      )
      .collect();
    const activeInjuryCount = injuries.filter((i) => !i.isDeleted).length;

    // Count today's encounters
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const encounters = await ctx.db
      .query("encounters")
      .withIndex("by_orgId_and_encounterDatetime", (q) =>
        q
          .eq("orgId", auth.orgId)
          .gte("encounterDatetime", todayStart.getTime())
          .lte("encounterDatetime", todayEnd.getTime())
      )
      .collect();
    const todayEncounterCount = encounters.filter((e) => !e.isDeleted).length;

    return {
      teamCount,
      athleteCount,
      athleticTrainerCount,
      activeInjuryCount,
      todayEncounterCount,
    };
  },
});

/**
 * Get organization by owner auth user ID (for finding existing org during registration)
 */
export const getByOwnerAuthUserId = query({
  args: { ownerAuthUserId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      domain: v.optional(v.string()),
      status: v.union(
        v.literal("pending_payment"),
        v.literal("trial"),
        v.literal("active"),
        v.literal("past_due"),
        v.literal("canceled")
      ),
      teamCount: v.number(),
      maxAthleticTrainersPerTeam: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_ownerAuthUserId", (q) =>
        q.eq("ownerAuthUserId", args.ownerAuthUserId)
      )
      .first();

    if (!org || org.isDeleted) return null;

    return {
      _id: org._id,
      _creationTime: org._creationTime,
      name: org.name,
      domain: org.domain,
      status: org.status,
      teamCount: org.teamCount,
      maxAthleticTrainersPerTeam: org.maxAthleticTrainersPerTeam,
    };
  },
});

/**
 * Get pending payment organization for current user
 * Used to redirect signed-in users to payment page if they haven't paid
 */
export const getPendingPaymentOrg = query({
  args: { authUserId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      name: v.string(),
      teamCount: v.number(),
      maxAthleticTrainersPerTeam: v.number(),
      plan: v.string(), // Derived from teamCount/maxATs
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_ownerAuthUserId", (q) =>
        q.eq("ownerAuthUserId", args.authUserId)
      )
      .first();

    if (!org || org.isDeleted || org.status !== "pending_payment") {
      return null;
    }

    // Derive plan from team count and ATs per team
    let plan = "single_team_trial";
    if (org.teamCount >= 15 || org.maxAthleticTrainersPerTeam >= 3) {
      plan = "program";
    } else if (org.teamCount >= 5 || org.maxAthleticTrainersPerTeam >= 2) {
      plan = "department";
    } else if (org.teamCount >= 999) {
      plan = "enterprise";
    }

    return {
      _id: org._id,
      name: org.name,
      teamCount: org.teamCount,
      maxAthleticTrainersPerTeam: org.maxAthleticTrainersPerTeam,
      plan,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new organization (called during registration)
 * Also creates the org admin user
 */
export const create = mutation({
  args: {
    name: v.string(),
    domain: v.optional(v.string()),
    ownerAuthUserId: v.string(),
    ownerEmail: v.string(),
    ownerFullName: v.string(),
    teamCount: v.number(),
    maxAthleticTrainersPerTeam: v.number(),
  },
  returns: v.object({
    orgId: v.id("organizations"),
    userId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    const timestamp = now();

    // Check if org already exists for this owner
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_ownerAuthUserId", (q) =>
        q.eq("ownerAuthUserId", args.ownerAuthUserId)
      )
      .first();

    if (existingOrg && !existingOrg.isDeleted) {
      // Return existing org and find user
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_authUserId", (q) =>
          q.eq("authUserId", args.ownerAuthUserId)
        )
        .first();

      if (existingUser) {
        return { orgId: existingOrg._id, userId: existingUser._id };
      }
    }

    // Create the organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      domain: args.domain,
      status: "pending_payment", // Payment required before access
      ownerAuthUserId: args.ownerAuthUserId,
      teamCount: args.teamCount,
      maxAthleticTrainersPerTeam: args.maxAthleticTrainersPerTeam,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Create the org admin user
    const userId = await ctx.db.insert("users", {
      orgId,
      authUserId: args.ownerAuthUserId,
      email: args.ownerEmail,
      fullName: args.ownerFullName,
      role: "org_admin",
      teamIds: [], // Org admins have access to all teams
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Log the creation
    await ctx.db.insert("orgAuditLogs", {
      orgId,
      userId,
      authUserId: args.ownerAuthUserId,
      action: "create",
      entityType: "organization",
      entityId: orgId,
      metadataJson: JSON.stringify({
        name: args.name,
        domain: args.domain,
        teamCount: args.teamCount,
      }),
      createdAt: timestamp,
    });

    return { orgId, userId };
  },
});

/**
 * Update organization settings (org admin only)
 */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    domain: v.optional(v.string()),
    settingsJson: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const org = await ctx.db.get(auth.orgId);
    if (!org || org.isDeleted) {
      throw new Error("Organization not found");
    }

    const updates: Partial<{
      name: string;
      domain: string;
      settingsJson: string;
      updatedAt: number;
    }> = {
      updatedAt: now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.domain !== undefined) updates.domain = args.domain;
    if (args.settingsJson !== undefined) updates.settingsJson = args.settingsJson;

    await ctx.db.patch(auth.orgId, updates);

    // Log the update
    await logAuditEvent(ctx, auth, auth.orgId, "update", "organization", auth.orgId, {
      updates: Object.keys(updates),
    });

    return true;
  },
});

/**
 * Update organization status (for subscription changes)
 */
export const updateStatus = mutation({
  args: {
    orgId: v.id("organizations"),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("trial"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled")
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // This is called by Stripe webhooks, so we don't require auth
    // but we do verify the org exists
    const org = await ctx.db.get(args.orgId);
    if (!org || org.isDeleted) {
      return false;
    }

    await ctx.db.patch(args.orgId, {
      status: args.status,
      updatedAt: now(),
    });

    // Log the status change
    await ctx.db.insert("orgAuditLogs", {
      orgId: args.orgId,
      action: "update",
      entityType: "organization_status",
      entityId: args.orgId,
      metadataJson: JSON.stringify({
        previousStatus: org.status,
        newStatus: args.status,
      }),
      createdAt: now(),
    });

    return true;
  },
});

/**
 * Soft delete an organization (org admin only)
 * This is a destructive action that should be used with caution
 */
export const softDelete = mutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const auth = await requireAuth(ctx);
    requireOrgAdmin(auth);

    const org = await ctx.db.get(auth.orgId);
    if (!org || org.isDeleted) {
      throw new Error("Organization not found");
    }

    const timestamp = now();

    await ctx.db.patch(auth.orgId, {
      isDeleted: true,
      deletedAt: timestamp,
      updatedAt: timestamp,
    });

    // Log the deletion
    await logAuditEvent(ctx, auth, auth.orgId, "delete", "organization", auth.orgId);

    return true;
  },
});

// =============================================================================
// Public Mutations (for Stripe integration)
// =============================================================================

/**
 * Create organization with subscription (called after successful Stripe payment)
 * This mutation creates org with active status and subscription record
 */
export const createWithSubscription = mutation({
  args: {
    name: v.string(),
    domain: v.optional(v.string()),
    ownerAuthUserId: v.string(),
    ownerEmail: v.string(),
    ownerFullName: v.string(),
    teamCount: v.number(),
    maxAthleticTrainersPerTeam: v.number(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.string(),
  },
  returns: v.object({
    orgId: v.id("organizations"),
    userId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    const timestamp = now();

    // Check if org already exists for this owner
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_ownerAuthUserId", (q) =>
        q.eq("ownerAuthUserId", args.ownerAuthUserId)
      )
      .first();

    if (existingOrg && !existingOrg.isDeleted) {
      // Update existing org to active status
      await ctx.db.patch(existingOrg._id, {
        status: "active",
        updatedAt: timestamp,
      });

      // Find existing user
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_authUserId", (q) =>
          q.eq("authUserId", args.ownerAuthUserId)
        )
        .first();

      if (existingUser) {
        // Create subscription record
        await ctx.db.insert("orgSubscriptions", {
          orgId: existingOrg._id,
          stripeCustomerId: args.stripeCustomerId,
          stripeSubscriptionId: args.stripeSubscriptionId,
          plan: args.plan,
          teamCount: args.teamCount,
          athleticTrainersPerTeam: args.maxAthleticTrainersPerTeam,
          status: "active",
          billingCycleStart: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        return { orgId: existingOrg._id, userId: existingUser._id };
      }
    }

    // Create the organization with active status
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      domain: args.domain,
      status: "active", // Already paid!
      ownerAuthUserId: args.ownerAuthUserId,
      teamCount: args.teamCount,
      maxAthleticTrainersPerTeam: args.maxAthleticTrainersPerTeam,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Create the org admin user
    const userId = await ctx.db.insert("users", {
      orgId,
      authUserId: args.ownerAuthUserId,
      email: args.ownerEmail,
      fullName: args.ownerFullName,
      role: "org_admin",
      teamIds: [], // Org admins have access to all teams
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Create subscription record
    await ctx.db.insert("orgSubscriptions", {
      orgId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      plan: args.plan,
      teamCount: args.teamCount,
      athleticTrainersPerTeam: args.maxAthleticTrainersPerTeam,
      status: "active",
      billingCycleStart: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Log the creation
    await ctx.db.insert("orgAuditLogs", {
      orgId,
      userId,
      authUserId: args.ownerAuthUserId,
      action: "create",
      entityType: "organization",
      entityId: orgId,
      metadataJson: JSON.stringify({
        name: args.name,
        domain: args.domain,
        teamCount: args.teamCount,
        plan: args.plan,
        stripeCustomerId: args.stripeCustomerId,
      }),
      createdAt: timestamp,
    });

    return { orgId, userId };
  },
});

// =============================================================================
// Dev/Test Mutations
// =============================================================================

/**
 * Create a test organization with active status (for development/testing)
 * This bypasses Stripe payment for testing purposes
 */
export const createTestOrganization = mutation({
  args: {
    name: v.string(),
    ownerAuthUserId: v.string(),
    ownerEmail: v.string(),
    ownerFullName: v.string(),
  },
  returns: v.object({
    orgId: v.id("organizations"),
    userId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    const timestamp = now();

    // Check if org already exists for this owner
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_ownerAuthUserId", (q) =>
        q.eq("ownerAuthUserId", args.ownerAuthUserId)
      )
      .first();

    if (existingOrg && !existingOrg.isDeleted) {
      // Update existing org to active status
      await ctx.db.patch(existingOrg._id, {
        status: "active",
        updatedAt: timestamp,
      });

      // Find existing user
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_authUserId", (q) =>
          q.eq("authUserId", args.ownerAuthUserId)
        )
        .first();

      if (existingUser) {
        return { orgId: existingOrg._id, userId: existingUser._id };
      }
    }

    // Create the organization with active status
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      status: "active",
      ownerAuthUserId: args.ownerAuthUserId,
      teamCount: 5,
      maxAthleticTrainersPerTeam: 2,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    // Create the org admin user
    const userId = await ctx.db.insert("users", {
      orgId,
      authUserId: args.ownerAuthUserId,
      email: args.ownerEmail,
      fullName: args.ownerFullName,
      role: "org_admin",
      teamIds: [],
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    });

    return { orgId, userId };
  },
});
