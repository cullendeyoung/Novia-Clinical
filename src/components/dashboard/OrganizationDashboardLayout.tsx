import { Outlet, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import OrganizationSidebar from "./OrganizationSidebar";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";

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
