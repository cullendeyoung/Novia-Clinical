import { Outlet } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import OrganizationSidebar from "./OrganizationSidebar";
import OrganizationPendingPayment from "@/pages/dashboard/OrganizationPendingPayment";
import FullPageSpinner from "@/components/ui/FullPageSpinner";

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

  // Also check for pending payment org by owner ID
  const pendingOrg = useQuery(
    api.organizations.getPendingPaymentOrg,
    session?.user?.id ? { authUserId: session.user.id } : "skip"
  );

  // Loading state
  if (currentUser === undefined || organization === undefined || pendingOrg === undefined) {
    return <FullPageSpinner />;
  }

  // If user has a pending payment organization, show payment page
  if (pendingOrg) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <OrganizationPendingPayment
          organizationName={pendingOrg.name}
          selectedPlan={pendingOrg.plan}
        />
      </div>
    );
  }

  // If org is in pending_payment status
  if (organization && organization.status === "pending_payment") {
    // Derive plan from team count
    let plan = "single_team_trial";
    if (organization.teamCount >= 15 || organization.maxAthleticTrainersPerTeam >= 3) {
      plan = "program";
    } else if (organization.teamCount >= 5 || organization.maxAthleticTrainersPerTeam >= 2) {
      plan = "department";
    } else if (organization.teamCount >= 999) {
      plan = "enterprise";
    }

    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <OrganizationPendingPayment
          organizationName={organization.name}
          selectedPlan={plan}
        />
      </div>
    );
  }

  // No user or organization found
  if (!currentUser || !organization) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Organization Not Found
          </h1>
          <p className="mt-2 text-muted-foreground">
            Please complete your organization registration to continue.
          </p>
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
