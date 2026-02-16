import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CreditCard,
  Check,
  Shield,
  ArrowLeft,
} from "lucide-react";

// Map plan values to Stripe checkout URLs or Price IDs
// TODO: Replace these with your actual Stripe Payment Links or integrate with Stripe Checkout API
const STRIPE_LINKS: Record<string, string> = {
  single_team_trial: "https://buy.stripe.com/YOUR_SINGLE_TEAM_LINK",
  department: "https://buy.stripe.com/YOUR_DEPARTMENT_LINK",
  program: "https://buy.stripe.com/YOUR_PROGRAM_LINK",
  enterprise: "", // Enterprise uses contact form instead
};

const PLAN_DETAILS: Record<
  string,
  { name: string; price: string; description: string; features: string[] }
> = {
  single_team_trial: {
    name: "Single Team Trial",
    price: "$299/month",
    description: "1 team, 1 athletic trainer",
    features: [
      "Unlimited athletes",
      "Injury tracking & documentation",
      "SOAP notes & daily care logs",
      "Participation status board",
      "Basic reporting",
      "Email support",
      "HIPAA compliant",
    ],
  },
  department: {
    name: "Department",
    price: "$8,399/year",
    description: "Up to 5 teams, 2 athletic trainers per team",
    features: [
      "Everything in Single Team Trial",
      "Multi-team dashboard",
      "Return-to-play workflows",
      "Custom note templates",
      "Advanced injury analytics",
      "Priority support",
      "Data export (JSON/CSV)",
    ],
  },
  program: {
    name: "Program",
    price: "$17,999/year",
    description: "Up to 15 teams, 3 athletic trainers per team",
    features: [
      "Everything in Department",
      "Physician sign-off workflows",
      "Cross-team reporting",
      "Compliance audit logs",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom pricing",
    description: "Unlimited teams and athletic trainers",
    features: [
      "Everything in Program",
      "Multi-institution support",
      "SSO / SAML integration",
      "Custom compliance reports",
      "On-site training",
      "Dedicated support team",
      "SLA guarantee",
    ],
  },
};

export default function OrganizationPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const plan = searchParams.get("plan") || "single_team_trial";
  const orgName = searchParams.get("org") || "Your Organization";

  const planDetails = PLAN_DETAILS[plan] || PLAN_DETAILS.single_team_trial;
  const stripeLink = STRIPE_LINKS[plan];

  useEffect(() => {
    // If no valid plan, redirect back to registration
    if (!PLAN_DETAILS[plan]) {
      navigate("/register/organization");
    }
  }, [plan, navigate]);

  const handlePayment = () => {
    if (plan === "enterprise") {
      // Redirect to contact page for enterprise
      navigate("/contact?inquiry=enterprise");
      return;
    }

    if (!stripeLink || stripeLink.includes("YOUR_")) {
      // Stripe not configured yet - show message
      alert(
        "Payment system is being configured. Please contact support@novia.com to complete your subscription."
      );
      return;
    }

    setIsLoading(true);
    // Redirect to Stripe Checkout
    window.location.href = stripeLink;
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="rounded-lg bg-white p-6 shadow-sm md:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-semibold mb-2">
              Complete Your Payment
            </h1>
            <p className="text-muted-foreground">
              Finalize your subscription for {orgName}
            </p>

            {/* Step Indicators */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm text-slate-500">
                  Organization Created
                </span>
              </div>
              <div className="h-px w-8 bg-primary" />
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  2
                </div>
                <span className="text-sm font-medium text-slate-900">
                  Payment
                </span>
              </div>
            </div>
          </div>

          {/* Plan Summary */}
          <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold text-slate-900">
                    {planDetails.name}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {planDetails.description}
                </p>
              </div>
              <div className="text-right">
                <div className="font-heading text-2xl font-bold text-slate-900">
                  {planDetails.price}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Plan includes:
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {planDetails.features.slice(0, 6).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Security Note */}
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <Shield className="h-5 w-5 flex-shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Your payment is secured by Stripe. We never store your card
              details on our servers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handlePayment}
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Redirecting to payment...
                </span>
              ) : plan === "enterprise" ? (
                "Contact Sales"
              ) : (
                `Pay ${planDetails.price}`
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              asChild
            >
              <Link to="/register/organization">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Registration
              </Link>
            </Button>
          </div>

          {/* Help Text */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Need help?{" "}
            <Link
              to="/contact"
              className="font-medium text-primary hover:text-primary/80"
            >
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
