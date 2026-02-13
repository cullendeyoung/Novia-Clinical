import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, Clock, XCircle } from "lucide-react";

type SubscriptionRequiredProps = {
  reason:
    | "no_subscription"
    | "subscription_canceled"
    | "payment_past_due"
    | "trial_expired"
    | "unknown_status";
};

const reasonConfig = {
  no_subscription: {
    icon: CreditCard,
    title: "Subscription Required",
    description:
      "To access the Novia Clinical platform, please subscribe to one of our plans.",
    cta: "View Plans",
    ctaLink: "/pricing",
  },
  subscription_canceled: {
    icon: XCircle,
    title: "Subscription Canceled",
    description:
      "Your subscription has been canceled. Reactivate to continue using Novia Clinical.",
    cta: "Reactivate Subscription",
    ctaLink: "/pricing",
  },
  payment_past_due: {
    icon: AlertCircle,
    title: "Payment Past Due",
    description:
      "Your payment is past due. Please update your payment method to continue using Novia Clinical.",
    cta: "Update Payment",
    ctaLink: "/dashboard/settings/billing",
  },
  trial_expired: {
    icon: Clock,
    title: "Trial Expired",
    description:
      "Your free trial has ended. Subscribe to continue using Novia Clinical.",
    cta: "Subscribe Now",
    ctaLink: "/pricing",
  },
  unknown_status: {
    icon: AlertCircle,
    title: "Account Issue",
    description:
      "There's an issue with your account. Please contact support for assistance.",
    cta: "Contact Support",
    ctaLink: "/contact",
  },
};

export default function SubscriptionRequired({
  reason,
}: SubscriptionRequiredProps) {
  const config = reasonConfig[reason] || reasonConfig.unknown_status;
  const Icon = config.icon;

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Icon className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          {config.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{config.description}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to={config.ctaLink}>{config.cta}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
