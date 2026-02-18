import { useState } from "react";
import { Outlet, Navigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import ATSidebar from "./ATSidebar";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { ATContext } from "@/contexts/ATContext";

export default function ATDashboardLayout() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const currentUser = useQuery(
    api.users.getCurrent,
    session?.user?.id ? {} : "skip"
  );
  const organization = useQuery(api.organizations.getCurrent);

  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(null);

  // Show loading while checking auth
  if (isSessionPending || currentUser === undefined) {
    return <FullPageSpinner />;
  }

  // Check if user is logged in
  if (!session?.user?.id) {
    return <Navigate to="/login" replace />;
  }

  // Allow org_admin to view AT portal for testing purposes
  // In production, this would only allow athletic_trainer role
  const allowedRoles = ["org_admin", "athletic_trainer", "physician"];
  if (currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/auth-router" replace />;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <ATContext.Provider value={{ selectedTeamId, setSelectedTeamId }}>
      <div className="flex h-screen bg-slate-50">
        <ATSidebar
          organizationName={organization?.name}
          userName={currentUser?.fullName || session?.user?.name}
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header */}
          <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
            <div className="flex items-center gap-3">
              {/* Show "Back to Admin" for org_admin users */}
              {currentUser?.role === "org_admin" && (
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                  <Link to="/org">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to Admin
                  </Link>
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {currentUser?.fullName || session?.user?.name}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </ATContext.Provider>
  );
}
