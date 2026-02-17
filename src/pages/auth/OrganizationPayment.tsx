import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CreditCard,
  Check,
  Shield,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { getStoredRegistrationData } from "@/lib/registration-storage";

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

  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

  const plan = searchParams.get("plan") || "single_team_trial";
  const orgName = searchParams.get("org") || "Your Organization";

  const planDetails = PLAN_DETAILS[plan] || PLAN_DETAILS.single_team_trial;

  // Get registration data
  const registrationData = useMemo(() => getStoredRegistrationData(), []);
  const hasRegistrationData = registrationData !== null;

  useEffect(() => {
    // If no valid plan, redirect back to registration
    if (!PLAN_DETAILS[plan]) {
      navigate("/register/organization");
    }
  }, [plan, navigate]);

  const handlePayment = async () => {
    if (plan === "enterprise") {
      // Redirect to contact page for enterprise
      navigate("/contact?inquiry=enterprise");
      return;
    }

    if (!registrationData) {
      toast.error("Registration data not found. Please start over.");
      navigate("/register/organization");
      return;
    }

    setIsLoading(true);

    try {
      // Create Stripe Checkout Session
      const result = await createCheckoutSession({
        plan: registrationData.plan,
        organizationName: registrationData.organizationName,
        email: registrationData.email,
        fullName: registrationData.fullName,
        domain: registrationData.domain || undefined,
        successUrl: `${window.location.origin}/register/organization/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/register/organization/payment?plan=${plan}&org=${encodeURIComponent(orgName)}`,
      });

      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create checkout session. Please try again."
      );
      setIsLoading(false);
    }
  };

  // Show warning if no registration data
  if (!hasRegistrationData) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="font-heading text-2xl font-semibold mb-2">
            Registration Data Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            Your registration session has expired or was not found. Please start the registration process again.
          </p>
          <Button asChild>
            <Link to="/register/organization">Start Registration</Link>
          </Button>
        </div>
      </div>
    );
  }

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
                  Organization Info
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

          {/* Info Note */}
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-800">
              Your account will be created automatically after your payment is processed successfully.
            </p>
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
                  Redirecting to Stripe...
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
              disabled={isLoading}
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
