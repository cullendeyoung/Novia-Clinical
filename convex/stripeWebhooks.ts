/**
 * Internal mutations for Stripe webhook handling
 * These are called from the HTTP webhook handler to update database state
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Update organization and subscription status based on Stripe subscription status
 */
export const updateSubscriptionStatus = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeStatus: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Find subscription by Stripe customer ID
    const subscription = await ctx.db
      .query("orgSubscriptions")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!subscription) {
      console.log("No subscription found for customer:", args.stripeCustomerId);
      return false;
    }

    // Map Stripe status to our status
    let newStatus: "pending_payment" | "trial" | "active" | "past_due" | "canceled";
    switch (args.stripeStatus) {
      case "active":
      case "trialing":
        newStatus = args.stripeStatus === "trialing" ? "trial" : "active";
        break;
      case "past_due":
        newStatus = "past_due";
        break;
      case "canceled":
      case "unpaid":
        newStatus = "canceled";
        break;
      default:
        console.log("Unhandled Stripe status:", args.stripeStatus);
        return false;
    }

    const timestamp = Date.now();

    // Update subscription status
    await ctx.db.patch(subscription._id, {
      status: newStatus,
      updatedAt: timestamp,
    });

    // Update organization status
    const org = await ctx.db.get(subscription.orgId);
    if (org && !org.isDeleted) {
      await ctx.db.patch(subscription.orgId, {
        status: newStatus,
        updatedAt: timestamp,
      });

      // Log the status change
      await ctx.db.insert("orgAuditLogs", {
        orgId: subscription.orgId,
        action: "subscription_status_change",
        entityType: "organization",
        entityId: subscription.orgId,
        metadataJson: JSON.stringify({
          previousStatus: org.status,
          newStatus,
          stripeStatus: args.stripeStatus,
          stripeCustomerId: args.stripeCustomerId,
        }),
        createdAt: timestamp,
      });
    }

    console.log(
      "Updated subscription status for customer:",
      args.stripeCustomerId,
      "to:",
      newStatus
    );
    return true;
  },
});

/**
 * Handle failed invoice payment - set org to past_due
 */
export const handleFailedPayment = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    invoiceId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Find subscription by Stripe customer ID
    const subscription = await ctx.db
      .query("orgSubscriptions")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    if (!subscription) {
      console.log("No subscription found for customer:", args.stripeCustomerId);
      return false;
    }

    const timestamp = Date.now();

    // Update subscription status to past_due
    await ctx.db.patch(subscription._id, {
      status: "past_due",
      updatedAt: timestamp,
    });

    // Update organization status
    const org = await ctx.db.get(subscription.orgId);
    if (org && !org.isDeleted) {
      await ctx.db.patch(subscription.orgId, {
        status: "past_due",
        updatedAt: timestamp,
      });

      // Log the failed payment
      await ctx.db.insert("orgAuditLogs", {
        orgId: subscription.orgId,
        action: "payment_failed",
        entityType: "invoice",
        entityId: args.invoiceId,
        metadataJson: JSON.stringify({
          previousStatus: org.status,
          newStatus: "past_due",
          stripeCustomerId: args.stripeCustomerId,
          invoiceId: args.invoiceId,
        }),
        createdAt: timestamp,
      });
    }

    console.log(
      "Set org to past_due due to failed payment for customer:",
      args.stripeCustomerId
    );
    return true;
  },
});

/**
 * Handle subscription deletion - set org to canceled
 */
export const handleSubscriptionDeleted = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Find subscription by Stripe subscription ID
    const subscription = await ctx.db
      .query("orgSubscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!subscription) {
      console.log("No subscription found:", args.stripeSubscriptionId);
      return false;
    }

    const timestamp = Date.now();

    // Update subscription status to canceled
    await ctx.db.patch(subscription._id, {
      status: "canceled",
      updatedAt: timestamp,
    });

    // Update organization status
    const org = await ctx.db.get(subscription.orgId);
    if (org && !org.isDeleted) {
      await ctx.db.patch(subscription.orgId, {
        status: "canceled",
        updatedAt: timestamp,
      });

      // Log the cancellation
      await ctx.db.insert("orgAuditLogs", {
        orgId: subscription.orgId,
        action: "subscription_canceled",
        entityType: "subscription",
        entityId: args.stripeSubscriptionId,
        metadataJson: JSON.stringify({
          previousStatus: org.status,
          newStatus: "canceled",
          stripeSubscriptionId: args.stripeSubscriptionId,
        }),
        createdAt: timestamp,
      });
    }

    console.log("Subscription canceled:", args.stripeSubscriptionId);
    return true;
  },
});
