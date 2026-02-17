"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import Stripe from "stripe";

// Initialize Stripe with secret key from environment
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(secretKey);
}

// Price IDs for each plan (you'll need to create these in Stripe Dashboard)
const PLAN_PRICE_IDS: Record<string, string> = {
  single_team_trial: process.env.STRIPE_PRICE_SINGLE_TEAM || "",
  department: process.env.STRIPE_PRICE_DEPARTMENT || "",
  program: process.env.STRIPE_PRICE_PROGRAM || "",
};

// Plan details for display
const PLAN_DETAILS: Record<string, { name: string; teams: number; atsPerTeam: number }> = {
  single_team_trial: { name: "Single Team Trial", teams: 1, atsPerTeam: 1 },
  department: { name: "Department", teams: 5, atsPerTeam: 2 },
  program: { name: "Program", teams: 15, atsPerTeam: 3 },
};

/**
 * Creates a Stripe Checkout Session for organization subscription
 */
export const createCheckoutSession = action({
  args: {
    plan: v.string(),
    organizationName: v.string(),
    email: v.string(),
    fullName: v.string(),
    domain: v.optional(v.string()),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  returns: v.object({
    sessionId: v.string(),
    url: v.string(),
  }),
  handler: async (_ctx, args) => {
    const stripe = getStripe();

    const planDetails = PLAN_DETAILS[args.plan];
    if (!planDetails) {
      throw new Error(`Invalid plan: ${args.plan}`);
    }

    const priceId = PLAN_PRICE_IDS[args.plan];
    if (!priceId) {
      throw new Error(`Price ID not configured for plan: ${args.plan}. Please set STRIPE_PRICE_${args.plan.toUpperCase()} environment variable.`);
    }

    // Create or retrieve customer
    const customers = await stripe.customers.list({
      email: args.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: args.email,
        name: args.fullName,
        metadata: {
          organizationName: args.organizationName,
          domain: args.domain || "",
          plan: args.plan,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        organizationName: args.organizationName,
        email: args.email,
        fullName: args.fullName,
        domain: args.domain || "",
        plan: args.plan,
        teams: planDetails.teams.toString(),
        atsPerTeam: planDetails.atsPerTeam.toString(),
      },
      subscription_data: {
        metadata: {
          organizationName: args.organizationName,
          plan: args.plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});

/**
 * Verifies a checkout session and returns the metadata
 */
export const verifyCheckoutSession = action({
  args: {
    sessionId: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      customerId: v.string(),
      subscriptionId: v.string(),
      organizationName: v.string(),
      email: v.string(),
      fullName: v.string(),
      domain: v.string(),
      plan: v.string(),
      teams: v.number(),
      atsPerTeam: v.number(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (_ctx, args) => {
    const stripe = getStripe();

    try {
      const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
        expand: ["subscription", "customer"],
      });

      if (session.payment_status !== "paid") {
        return {
          success: false as const,
          error: "Payment not completed",
        };
      }

      const metadata = session.metadata || {};
      const subscription = session.subscription as Stripe.Subscription;
      const customer = session.customer as Stripe.Customer;

      return {
        success: true as const,
        customerId: customer.id,
        subscriptionId: subscription.id,
        organizationName: metadata.organizationName || "",
        email: metadata.email || "",
        fullName: metadata.fullName || "",
        domain: metadata.domain || "",
        plan: metadata.plan || "single_team_trial",
        teams: parseInt(metadata.teams || "1", 10),
        atsPerTeam: parseInt(metadata.atsPerTeam || "1", 10),
      };
    } catch (error) {
      console.error("Error verifying checkout session:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
