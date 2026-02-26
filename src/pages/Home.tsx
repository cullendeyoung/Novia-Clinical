import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Mic,
  FileText,
  Share2,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Voice Recording",
    description:
      "Simply speak naturally during patient encounters. Our AI captures every detail.",
  },
  {
    icon: FileText,
    title: "Smart Templates",
    description:
      "Generate SOAP notes, summaries, or custom formats tailored to your specialty.",
  },
  {
    icon: Share2,
    title: "EHR Integration",
    description:
      "Seamlessly export to Epic, Cerner, and other major EHR systems.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Record",
    description: "Click record and speak naturally during your patient encounter.",
  },
  {
    step: "2",
    title: "Transcribe",
    description: "Our AI transcribes your session with medical-grade accuracy.",
  },
  {
    step: "3",
    title: "Generate",
    description: "Get perfectly formatted clinical notes in seconds.",
  },
  {
    step: "4",
    title: "Export",
    description: "Send to your EHR or store securely in Novia.",
  },
];

const testimonials = [
  {
    quote:
      "Novia has cut my documentation time in half. I finally have time to focus on what matters - my patients.",
    name: "Dr. Sarah Chen",
    role: "Family Physician",
    initials: "SC",
  },
  {
    quote:
      "The AI understands PT terminology perfectly. My notes are more detailed than ever, with less effort.",
    name: "Michael Torres",
    role: "Physical Therapist",
    initials: "MT",
  },
  {
    quote:
      "As a psychologist, accurate documentation is critical. Novia captures nuances I used to miss.",
    name: "Dr. Emily Brooks",
    role: "Psychologist",
    initials: "EB",
  },
];

const stats = [
  { value: "50%", label: "Less documentation time" },
  { value: "99.2%", label: "Transcription accuracy" },
  { value: "10,000+", label: "Notes generated daily" },
  { value: "HIPAA", label: "Fully compliant" },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              AI-Powered Clinical Documentation
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Reduce documentation time by 50%. Just speak naturally and let our
              AI generate accurate, compliant clinical notes in seconds.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Link to="/pricing">View Pricing</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                <Link to="/athletic">Universities/Organizations</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              14-day free trial. No credit card required.
            </p>
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-sm text-muted-foreground mb-3">
                Already have an account?
              </p>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                <a href="/portal" target="_blank" rel="noopener noreferrer">
                  Open Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Temporary Dev Access - Portal Quick Links */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-xs text-amber-600 font-medium mb-3">
                DEV MODE - Quick Portal Access
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/org">Admin Portal</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/at">AT Portal</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/athlete">Athlete Portal</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/login">Login</Link>
                </Button>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-4 mb-3">
                CLINIC EMR - Physical Therapy
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/pt">PT Portal (Admin/Clinician)</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/clinic-patient">Clinic Patient Portal</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-heading text-3xl font-bold text-primary md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold text-slate-900">
              Everything you need for clinical documentation
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built by clinicians, for clinicians. HIPAA compliant from day one.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold text-slate-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From voice to finished note in under a minute
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {howItWorks.map((step, index) => (
              <div key={step.title} className="relative text-center">
                {index < howItWorks.length - 1 && (
                  <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-primary/20 md:block" />
                )}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-heading text-3xl font-bold text-slate-900">
                Spend more time with patients, less time typing
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Novia handles the documentation so you can focus on care.
                Works for physicians, PTs, chiropractors, psychologists, and
                more.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "HIPAA-compliant with BAA available",
                  "Works with your existing EHR",
                  "Custom templates for any specialty",
                  "Real-time transcription with 99%+ accuracy",
                  "Audit trails for compliance",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-slate-700">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8">
                <Link to="/register">Start Free Trial</Link>
              </Button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Average time saved per note
              </div>
              <div className="mt-2 font-heading text-5xl font-bold text-primary">
                12 minutes
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Traditional typing</span>
                  <span className="font-medium">15-20 min</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200">
                  <div className="h-2 w-full rounded-full bg-slate-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">With Novia</span>
                  <span className="font-medium text-primary">3-5 min</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200">
                  <div className="h-2 w-1/4 rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="font-heading text-3xl font-bold text-slate-900">
              Trusted by clinicians everywhere
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See what healthcare providers are saying about Novia
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <blockquote className="text-slate-700">
                  "{testimonial.quote}"
                </blockquote>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-medium text-primary">
                    {testimonial.initials}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-2xl bg-slate-900 p-8 md:p-12">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  <span className="font-medium text-primary">
                    HIPAA Compliant
                  </span>
                </div>
                <h2 className="mt-4 font-heading text-2xl font-bold text-white md:text-3xl">
                  Security you can trust
                </h2>
                <p className="mt-4 text-slate-300">
                  Your patient data is protected with enterprise-grade security.
                  We're fully HIPAA compliant with BAAs available for all plans.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, label: "End-to-end encryption" },
                  { icon: Zap, label: "SOC 2 Type II certified" },
                  { icon: FileText, label: "Comprehensive audit logs" },
                  { icon: Check, label: "BAA available" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-sm text-slate-300"
                  >
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-slate-900">
            Ready to transform your documentation?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of clinicians who save hours every week with
            Novia. Start your free trial today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
