import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type PricingTier = {
  name: string;
  description: string;
  ehrPrice: number | "Custom";
  standalonePrice: number | "Custom";
  features: string[];
  clinicians: string;
  notes: string;
  highlighted?: boolean;
  cta: string;
  ctaLink: string;
};

const pricingTiers: PricingTier[] = [
  {
    name: "Solo",
    description: "Perfect for individual practitioners",
    ehrPrice: 199,
    standalonePrice: 249,
    clinicians: "1 clinician",
    notes: "100 notes/month",
    features: [
      "AI-powered transcription",
      "SOAP, Summary & Custom notes",
      "Basic note templates",
      "PDF export",
      "Email support",
      "HIPAA compliant",
    ],
    cta: "Start Free Trial",
    ctaLink: "/register",
  },
  {
    name: "Team",
    description: "For small practices",
    ehrPrice: 449,
    standalonePrice: 549,
    clinicians: "Up to 5 clinicians",
    notes: "500 notes/month",
    features: [
      "Everything in Solo",
      "Custom note templates",
      "Team dashboard",
      "Basic analytics",
      "Priority support",
      "Shared patient records",
    ],
    highlighted: true,
    cta: "Start Free Trial",
    ctaLink: "/register",
  },
  {
    name: "Practice",
    description: "For growing practices",
    ehrPrice: 799,
    standalonePrice: 999,
    clinicians: "Up to 10 clinicians",
    notes: "Unlimited notes",
    features: [
      "Everything in Team",
      "Advanced analytics",
      "EHR integration support",
      "Dedicated account manager",
      "Custom workflows",
      "API access",
    ],
    cta: "Start Free Trial",
    ctaLink: "/register",
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    ehrPrice: "Custom",
    standalonePrice: "Custom",
    clinicians: "Unlimited clinicians",
    notes: "Unlimited notes",
    features: [
      "Everything in Practice",
      "Custom integrations",
      "SLA guarantee",
      "On-site training",
      "Dedicated support team",
      "Custom compliance reports",
    ],
    cta: "Contact Sales",
    ctaLink: "/contact",
  },
];

function PricingCard({
  tier,
  showEhrPricing,
}: {
  tier: PricingTier;
  showEhrPricing: boolean;
}) {
  const price = showEhrPricing ? tier.ehrPrice : tier.standalonePrice;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
        tier.highlighted
          ? "border-primary ring-2 ring-primary"
          : "border-slate-200"
      }`}
    >
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
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
        {price === "Custom" ? (
          <div className="flex items-baseline">
            <span className="font-heading text-4xl font-bold text-slate-900">
              Custom
            </span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="font-heading text-4xl font-bold text-slate-900">
              ${price}
            </span>
            <span className="ml-1 text-muted-foreground">/month</span>
          </div>
        )}
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <p>{tier.clinicians}</p>
          <p>{tier.notes}</p>
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

      <Button
        asChild
        variant={tier.highlighted ? "default" : "outline"}
        className="w-full"
      >
        <Link to={tier.ctaLink}>{tier.cta}</Link>
      </Button>
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-3xl font-bold text-slate-900 md:text-4xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Choose the plan that fits your practice. All plans include a 14-day
            free trial with no credit card required.
          </p>
        </div>

        {/* Pricing Toggle Info */}
        <div className="mx-auto mt-8 max-w-2xl rounded-lg bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-700">
            <strong>With EHR Integration:</strong> Export notes to your existing
            system (Epic, Cerner, etc.)
            <br />
            <strong>Standalone:</strong> Full patient management and note
            storage included
          </p>
        </div>

        {/* EHR Pricing Section */}
        <div className="mt-12">
          <div className="mb-6 text-center">
            <h2 className="font-heading text-xl font-semibold text-slate-900">
              With EHR Integration
            </h2>
            <p className="text-sm text-muted-foreground">
              For clinicians with an existing EHR/EMR system
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((tier) => (
              <PricingCard key={tier.name} tier={tier} showEhrPricing={true} />
            ))}
          </div>
        </div>

        {/* Standalone Pricing Section */}
        <div className="mt-16">
          <div className="mb-6 text-center">
            <h2 className="font-heading text-xl font-semibold text-slate-900">
              Standalone (No EHR)
            </h2>
            <p className="text-sm text-muted-foreground">
              Full documentation system with patient management included
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((tier) => (
              <PricingCard
                key={`standalone-${tier.name}`}
                tier={tier}
                showEhrPricing={false}
              />
            ))}
          </div>
        </div>

        {/* FAQ / Additional Info */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="font-heading text-center text-2xl font-semibold text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="font-medium text-slate-900">
                What's included in the free trial?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Full access to all features in your selected plan for 14 days.
                No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                What's the difference between EHR and Standalone pricing?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                With EHR Integration, notes are exported to your existing
                system. Standalone includes full patient management and secure
                note storage within Novia.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                Is my data HIPAA compliant?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes. All plans include HIPAA-compliant data storage, encryption
                at rest and in transit, and comprehensive audit logging.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Can I switch plans?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                take effect at the start of your next billing cycle.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <h2 className="font-heading text-2xl font-semibold text-slate-900">
            Ready to save hours on documentation?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/register">Start Free Trial</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
