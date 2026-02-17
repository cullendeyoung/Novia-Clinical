import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authClient, createAuth } from "./auth";
import Stripe from "stripe";

const http = httpRouter();

// Register auth routes
authClient.registerRoutes(http, createAuth, { cors: true });

// Stripe webhook handler
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (_ctx, req) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;
    const body = await req.text();

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only process if payment is successful
        if (session.payment_status === "paid") {
          const metadata = session.metadata || {};

          console.log("Processing successful checkout:", {
            sessionId: session.id,
            customerId: session.customer,
            metadata,
          });

          // Note: The frontend PaymentSuccess page handles account creation
          // This webhook is here for logging and could be extended for
          // server-side account creation if needed
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription created:", subscription.id);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription updated:", subscription.id, subscription.status);

        // Handle subscription status changes (past_due, canceled, etc.)
        if (subscription.status === "past_due" || subscription.status === "canceled") {
          const customerId = typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
          console.log("Subscription status changed for customer:", customerId);
          // TODO: Query org by stripeCustomerId and update status
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription deleted:", subscription.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice payment succeeded:", invoice.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice payment failed:", invoice.id);
        // TODO: Update org status to past_due
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
