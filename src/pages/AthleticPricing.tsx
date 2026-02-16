import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Check,
  Users,
  Shield,
  FileText,
  Activity,
  Download,
  Building2,
  GraduationCap,
  Trophy,
} from "lucide-react";

type PricingTier = {
  name: string;
  description: string;
  price: number | "Custom";
  teams: string;
  atsPerTeam: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaLink: string;
};

const pricingTiers: PricingTier[] = [
  {
    name: "Single Team Trial",
    description: "Perfect for small athletic programs",
    price: 299,
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
    cta: "Start Free Trial",
    ctaLink: "/register/organization",
  },
  {
    name: "Department",
    description: "For growing athletic departments",
    price: 699,
    teams: "Up to 5 teams",
    atsPerTeam: "3 athletic trainers per team",
    features: [
      "Everything in Single Team Trial",
      "Multi-team dashboard",
      "Return-to-play workflows",
      "Custom note templates",
      "Advanced injury analytics",
      "Priority support",
      "Data export (JSON/CSV)",
    ],
    highlighted: true,
    cta: "Start Free Trial",
    ctaLink: "/register/organization",
  },
  {
    name: "Program",
    description: "For full athletic departments",
    price: 1499,
    teams: "Up to 15 teams",
    atsPerTeam: "5 athletic trainers per team",
    features: [
      "Everything in Department",
      "Physician sign-off workflows",
      "Cross-team reporting",
      "Compliance audit logs",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Start Free Trial",
    ctaLink: "/register/organization",
  },
  {
    name: "Enterprise",
    description: "For conferences & large organizations",
    price: "Custom",
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
    cta: "Contact Sales",
    ctaLink: "/contact",
  },
];

const benefits = [
  {
    icon: Activity,
    title: "Injury Tracking",
    description:
      "Track injuries from initial evaluation through return-to-play with comprehensive documentation.",
  },
  {
    icon: FileText,
    title: "Clinical Documentation",
    description:
      "Generate SOAP notes, daily care logs, and RTP clearances with AI-powered voice transcription.",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Manage multiple teams, athletic trainers, and physicians from a single dashboard.",
  },
  {
    icon: Download,
    title: "Data Export",
    description:
      "Export all your data in standard formats. Your data is always yours to keep.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description:
      "Enterprise-grade security with full HIPAA compliance and comprehensive audit logs.",
  },
  {
    icon: Trophy,
    title: "ATS-Compatible",
    description:
      "Generate notes in ATS-friendly formats for easy copy/paste or future integrations.",
  },
];

const useCases = [
  {
    icon: GraduationCap,
    title: "Universities & Colleges",
    description:
      "From Division I to NAIA, manage all your varsity sports teams in one platform.",
  },
  {
    icon: Trophy,
    title: "Professional Teams",
    description:
      "NHL, NBA, NFL, MLB, and MLS teams trust our platform for athlete care documentation.",
  },
  {
    icon: Building2,
    title: "High Schools",
    description:
      "Affordable plans for high school athletic departments with multiple sports programs.",
  },
];

function PricingCard({ tier }: { tier: PricingTier }) {
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
        {tier.price === "Custom" ? (
          <div className="flex items-baseline">
            <span className="font-heading text-4xl font-bold text-slate-900">
              Custom
            </span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="font-heading text-4xl font-bold text-slate-900">
              ${tier.price}
            </span>
            <span className="ml-1 text-muted-foreground">/year</span>
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

export default function AthleticPricing() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Trophy className="h-4 w-4" />
              For Athletic Departments & Organizations
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
              Athletic Training Documentation Made Simple
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              The complete platform for athletic trainers. Track injuries,
              document encounters, and manage return-to-play workflows - all
              HIPAA compliant.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register/organization">Start Free Trial</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contact">Contact Sales</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              14-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-2xl font-bold text-slate-900 md:text-3xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose the plan that fits your athletic department
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
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

      {/* Benefits Section */}
      <section className="bg-slate-50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-2xl font-bold text-slate-900 md:text-3xl">
              Everything You Need for Athletic Training
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built specifically for athletic trainers and team physicians
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-2xl font-bold text-slate-900 md:text-3xl">
              Trusted by Athletic Programs Nationwide
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <useCase.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  {useCase.title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-slate-900 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="font-medium text-primary">HIPAA Compliant</span>
              </div>
              <h2 className="mt-4 font-heading text-2xl font-bold text-white md:text-3xl">
                Enterprise-Grade Security
              </h2>
              <p className="mt-4 text-slate-300">
                Your athletes' health information is protected with the same
                security standards used by major healthcare systems. Full HIPAA
                compliance with BAAs available.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                "End-to-end encryption",
                "Comprehensive audit logs",
                "Role-based access control",
                "Soft delete (no data loss)",
                "Cross-org isolation",
                "BAA available",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Migration Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 md:p-12">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="font-heading text-2xl font-bold text-slate-900 md:text-3xl">
                  Your Data, Your Way
                </h2>
                <p className="mt-4 text-muted-foreground">
                  We believe your data belongs to you. Export all your
                  organization's data at any time in standard formats (JSON,
                  CSV) with full relationship integrity preserved.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Full data export at any time",
                    "Standard JSON/CSV formats",
                    "All relationships preserved",
                    "Attachments included with manifest",
                    "No vendor lock-in",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-primary" />
                      <span className="text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="text-sm font-medium text-muted-foreground">
                  Export Preview
                </div>
                <pre className="mt-4 overflow-x-auto rounded bg-slate-900 p-4 text-xs text-slate-300">
{`{
  "exportVersion": "1.0",
  "organization": { ... },
  "teams": [ ... ],
  "athletes": [ ... ],
  "injuries": [ ... ],
  "encounters": [ ... ]
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-slate-50 py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-heading text-center text-2xl font-semibold text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="font-medium text-slate-900">
                How does the team structure work?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Organizations sign up and create teams (e.g., "Men's Basketball",
                "Women's Soccer"). Each team can have athletic trainers assigned
                to it. ATs receive an email invitation to join. Athletes can
                self-register using a team invite link.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                Can athletic trainers work with multiple teams?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes! Athletic trainers can be assigned to multiple teams and
                access all their athletes from a single dashboard.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                Is my data isolated from other organizations?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Absolutely. Each organization's data is completely isolated.
                Users from one organization can never access data from another
                organization. This is enforced at every level of our system.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                Can physicians sign off on notes?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes. Team physicians can be invited with a special role that
                allows them to review and sign off on encounter notes created by
                athletic trainers.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900">
                What's included in the free trial?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Full access to all features in your selected plan for 14 days.
                No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-heading text-2xl font-bold text-slate-900 md:text-3xl">
            Ready to modernize your athletic training documentation?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join athletic departments nationwide who trust Novia for their
            clinical documentation.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register/organization">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
