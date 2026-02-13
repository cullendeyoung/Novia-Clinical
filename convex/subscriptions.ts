import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Pricing configuration
export const PRICING = {
  solo_ehr: { price: 199, maxClinicians: 1, maxNotes: 100 },
  solo_standalone: { price: 249, maxClinicians: 1, maxNotes: 100 },
  team_ehr: { price: 449, maxClinicians: 5, maxNotes: 500 },
  team_standalone: { price: 549, maxClinicians: 5, maxNotes: 500 },
  practice_ehr: { price: 799, maxClinicians: 10, maxNotes: -1 }, // -1 = unlimited
  practice_standalone: { price: 999, maxClinicians: 10, maxNotes: -1 },
  enterprise: { price: 0, maxClinicians: -1, maxNotes: -1 }, // Custom pricing
} as const;

// Get subscription status for a clinician
export const getByClinicianId = query({
  args: { clinicianId: v.id("clinicians") },
  returns: v.union(
    v.object({
      _id: v.id("subscriptions"),
      _creationTime: v.number(),
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_clinicianId", (q) => q.eq("clinicianId", args.clinicianId))
      .unique();
  },
});

// Helper to calculate notes remaining
function getNotesRemaining(
  maxNotes: number,
  used: number
): number | "unlimited" {
  if (maxNotes === -1) {
    return "unlimited" as const;
  }
  return maxNotes - used;
}

// Check if clinician has active subscription
export const checkAccess = query({
  args: { clinicianId: v.id("clinicians") },
  returns: v.object({
    hasAccess: v.boolean(),
    reason: v.optional(v.string()),
    subscription: v.optional(
      v.object({
        plan: v.string(),
        status: v.string(),
        hasEhrIntegration: v.boolean(),
        notesRemaining: v.union(v.number(), v.literal("unlimited")),
        trialDaysRemaining: v.optional(v.number()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clinicianId", (q) => q.eq("clinicianId", args.clinicianId))
      .unique();

    if (!subscription) {
      return {
        hasAccess: false,
        reason: "no_subscription",
      };
    }

    const now = Date.now();

    // Check subscription status
    if (subscription.status === "canceled") {
      return {
        hasAccess: false,
        reason: "subscription_canceled",
      };
    }

    if (subscription.status === "past_due") {
      return {
        hasAccess: false,
        reason: "payment_past_due",
      };
    }

    // Check trial status
    if (subscription.status === "trialing" && subscription.trialEndsAt) {
      if (now > subscription.trialEndsAt) {
        return {
          hasAccess: false,
          reason: "trial_expired",
        };
      }

      const trialDaysRemaining = Math.ceil(
        (subscription.trialEndsAt - now) / (1000 * 60 * 60 * 24)
      );

      const notesRemaining = getNotesRemaining(
        subscription.maxNotesPerMonth,
        subscription.notesUsedThisMonth
      );

      return {
        hasAccess: true,
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          hasEhrIntegration: subscription.hasEhrIntegration,
          notesRemaining,
          trialDaysRemaining,
        },
      };
    }

    // Active subscription
    if (subscription.status === "active") {
      const notesRemaining = getNotesRemaining(
        subscription.maxNotesPerMonth,
        subscription.notesUsedThisMonth
      );

      return {
        hasAccess: true,
        subscription: {
          plan: subscription.plan,
          status: subscription.status,
          hasEhrIntegration: subscription.hasEhrIntegration,
          notesRemaining,
        },
      };
    }

    return {
      hasAccess: false,
      reason: "unknown_status",
    };
  },
});

// Create subscription (called after Stripe checkout success)
export const create = mutation({
  args: {
    clinicianId: v.id("clinicians"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.string(),
    hasEhrIntegration: v.boolean(),
    status: v.string(),
    trialDays: v.optional(v.number()),
  },
  returns: v.id("subscriptions"),
  handler: async (ctx, args) => {
    // Get pricing config for plan
    const planKey = args.plan as keyof typeof PRICING;
    const pricing = PRICING[planKey] || PRICING.solo_ehr;

    const now = Date.now();
    const trialEndsAt = args.trialDays
      ? now + args.trialDays * 24 * 60 * 60 * 1000
      : undefined;

    const subscriptionId = await ctx.db.insert("subscriptions", {
      clinicianId: args.clinicianId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      plan: args.plan,
      hasEhrIntegration: args.hasEhrIntegration,
      maxClinicians: pricing.maxClinicians,
      maxNotesPerMonth: pricing.maxNotes,
      notesUsedThisMonth: 0,
      billingCycleStart: now,
      status: args.status,
      trialEndsAt,
    });

    // Get clinician for audit log
    const clinician = await ctx.db.get(args.clinicianId);
    if (clinician) {
      await ctx.db.insert("auditLogs", {
        clinicianId: args.clinicianId,
        action: "subscription_created",
        resourceType: "subscription",
        resourceId: subscriptionId,
        details: JSON.stringify({
          plan: args.plan,
          hasEhrIntegration: args.hasEhrIntegration,
          status: args.status,
        }),
      });
    }

    return subscriptionId;
  },
});

// Update subscription status (called by Stripe webhook)
export const updateStatus = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .unique();

    if (!subscription) {
      return false;
    }

    await ctx.db.patch(subscription._id, {
      status: args.status,
    });

    // Audit log
    if (subscription.clinicianId) {
      await ctx.db.insert("auditLogs", {
        clinicianId: subscription.clinicianId,
        action: "subscription_status_changed",
        resourceType: "subscription",
        resourceId: subscription._id,
        details: JSON.stringify({
          newStatus: args.status,
          previousStatus: subscription.status,
        }),
      });
    }

    return true;
  },
});

// Increment notes used count
export const incrementNotesUsed = mutation({
  args: { clinicianId: v.id("clinicians") },
  returns: v.object({
    success: v.boolean(),
    notesRemaining: v.union(v.number(), v.literal("unlimited")),
  }),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clinicianId", (q) => q.eq("clinicianId", args.clinicianId))
      .unique();

    if (!subscription) {
      return { success: false, notesRemaining: 0 };
    }

    // Check if at limit
    if (
      subscription.maxNotesPerMonth !== -1 &&
      subscription.notesUsedThisMonth >= subscription.maxNotesPerMonth
    ) {
      return { success: false, notesRemaining: 0 };
    }

    await ctx.db.patch(subscription._id, {
      notesUsedThisMonth: subscription.notesUsedThisMonth + 1,
    });

    const notesRemaining = getNotesRemaining(
      subscription.maxNotesPerMonth,
      subscription.notesUsedThisMonth + 1
    );

    return { success: true, notesRemaining };
  },
});

// Reset monthly notes count (called by cron job at billing cycle start)
export const resetMonthlyNotes = mutation({
  args: { stripeSubscriptionId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .unique();

    if (!subscription) {
      return false;
    }

    await ctx.db.patch(subscription._id, {
      notesUsedThisMonth: 0,
      billingCycleStart: Date.now(),
    });

    return true;
  },
});
