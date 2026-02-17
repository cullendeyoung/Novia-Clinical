import { Outlet, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import OrganizationSidebar from "./OrganizationSidebar";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";

export default function OrganizationDashboardLayout() {
  const { data: session } = authClient.useSession();

  const currentUser = useQuery(
    api.users.getCurrent,
    session?.user?.id ? {} : "skip"
  );

  const organization = useQuery(
    api.organizations.getCurrent,
    session?.user?.id ? {} : "skip"
  );

  // Loading state
  if (currentUser === undefined || organization === undefined) {
    return <FullPageSpinner />;
  }

  // No user or organization found
  if (!currentUser || !organization) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Organization Not Found
          </h1>
          <p className="mt-2 text-muted-foreground mb-6">
            Please complete your organization registration to continue.
          </p>
          <Button asChild>
            <Link to="/register/organization">Register Organization</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check if subscription is active or trial
  const isSubscriptionActive = organization.status === "active" || organization.status === "trial";

  // Subscription not active - show payment required screen
  if (!isSubscriptionActive) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Subscription Required
          </h1>
          <p className="mt-2 text-muted-foreground mb-2">
            Your organization <strong>{organization.name}</strong> requires an active subscription to access the dashboard.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Status: <span className="font-medium capitalize">{organization.status.replace("_", " ")}</span>
          </p>
          <Button asChild className="w-full">
            <Link to="/register/organization/payment?plan=single_team_trial">
              <CreditCard className="mr-2 h-4 w-4" />
              Complete Payment
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Everything checks out - render organization dashboard
  return (
    <div className="flex h-[calc(100vh-64px)]">
      <OrganizationSidebar
        organizationName={organization.name}
        userName={currentUser.fullName}
      />
      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet
          context={{
            user: currentUser,
            organization,
          }}
        />
      </main>
    </div>
  );
}
