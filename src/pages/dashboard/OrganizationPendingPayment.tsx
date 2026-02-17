import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Check,
  AlertCircle,
  Shield,
  CreditCard,
} from "lucide-react";

// Map plan values to Stripe checkout URLs
const STRIPE_LINKS: Record<string, string> = {
  single_team_trial: "https://buy.stripe.com/28E00l9gccQm90g6gW3ZK00",
  department: "https://buy.stripe.com/9B6aEZ6408A64K048O3ZK02",
  program: "https://buy.stripe.com/bJeaEZcso8A64K020G3ZK01",
  enterprise: "",
};

type PricingTier = {
  id: string;
  name: string;
  description: string;
  price: number | "Custom";
  billingPeriod: "month" | "year";
  teams: string;
  atsPerTeam: string;
  features: string[];
  highlighted?: boolean;
};

const pricingTiers: PricingTier[] = [
  {
    id: "single_team_trial",
    name: "Single Team Trial",
    description: "Perfect for small athletic programs",
    price: 299,
    billingPeriod: "month",
    teams: "1 team",
    atsPerTeam: "1 athletic trainer",
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
  {
    id: "department",
    name: "Department",
    description: "For growing athletic departments",
    price: 8399,
    billingPeriod: "year",
    teams: "Up to 5 teams",
    atsPerTeam: "2 athletic trainers per team",
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
  {
    id: "program",
    name: "Program",
    description: "For full athletic departments",
    price: 17999,
    billingPeriod: "year",
    teams: "Up to 15 teams",
    atsPerTeam: "3 athletic trainers per team",
    features: [
      "Everything in Department",
      "Physician sign-off workflows",
      "Cross-team reporting",
      "Compliance audit logs",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
    ],
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For conferences & large organizations",
    price: "Custom",
    billingPeriod: "year",
    teams: "Unlimited teams",
    atsPerTeam: "Unlimited athletic trainers",
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
];

interface OrganizationPendingPaymentProps {
  organizationName: string;
  selectedPlan?: string;
}

function PricingCard({
  tier,
  isSelected,
}: {
  tier: PricingTier;
  isSelected: boolean;
}) {
  const stripeLink = STRIPE_LINKS[tier.id];

  const handlePayment = () => {
    if (tier.id === "enterprise" || !stripeLink) {
      return;
    }
    window.location.href = stripeLink;
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
        isSelected
          ? "border-primary ring-2 ring-primary"
          : tier.highlighted
            ? "border-primary/50"
            : "border-slate-200"
      }`}
    >
      {isSelected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
          Your Plan
        </div>
      )}
      {!isSelected && tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-500 px-3 py-1 text-xs font-medium text-white">
          Most Popular
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-heading text-xl font-semibold text-slate-900">
          {tier.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
      </div>

      <div className="mb-6">
        {tier.price === "Custom" ? (
          <div className="flex items-baseline">
            <span className="font-heading text-4xl font-bold text-slate-900">
              Custom
            </span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="font-heading text-4xl font-bold text-slate-900">
              ${tier.price.toLocaleString()}
            </span>
            <span className="ml-1 text-muted-foreground">
              /{tier.billingPeriod}
            </span>
          </div>
        )}
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>{tier.teams}</p>
          <p>{tier.atsPerTeam}</p>
        </div>
      </div>

      <ul className="mb-6 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="h-5 w-5 flex-shrink-0 text-primary" />
            <span className="text-sm text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>

      {tier.id === "enterprise" ? (
        <Button asChild variant="outline" className="w-full">
          <Link to="/contact">Contact Sales</Link>
        </Button>
      ) : (
        <Button
          onClick={handlePayment}
          variant={isSelected ? "default" : "outline"}
          className="w-full"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {isSelected ? "Complete Payment" : `Pay ${tier.price === "Custom" ? "" : `$${tier.price.toLocaleString()}`}`}
        </Button>
      )}
    </div>
  );
}

export default function OrganizationPendingPayment({
  organizationName,
  selectedPlan,
}: OrganizationPendingPaymentProps) {
  return (
    <div className="flex flex-col py-8">
      {/* Alert Banner */}
      <div className="mx-auto w-full max-w-7xl px-4 mb-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">
                Payment Required
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                Your organization <strong>{organizationName}</strong> has been created, but payment has not been received.
                Please complete payment to activate your account and access all features.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-2xl font-bold text-slate-900 md:text-3xl">
              Complete Your Subscription
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Select your plan and complete payment to get started
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={tier.id}
                tier={tier}
                isSelected={selectedPlan === tier.id}
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include unlimited athletes per team. Need more teams or
              custom features?{" "}
              <Link
                to="/contact"
                className="font-medium text-primary hover:underline"
              >
                Contact us
              </Link>{" "}
              for a custom quote.
            </p>
          </div>
        </div>
      </section>

      {/* Security Note */}
      <section className="py-8">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <Shield className="h-5 w-5 flex-shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Your payment is secured by Stripe. We never store your card
              details on our servers.
            </p>
          </div>
        </div>
      </section>

      {/* Help Text */}
      <div className="mx-auto max-w-3xl px-4 text-center">
        <p className="text-sm text-muted-foreground">
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
  );
}
