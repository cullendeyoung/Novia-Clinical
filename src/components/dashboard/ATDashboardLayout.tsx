import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { ATContext, type ATViewMode } from "@/contexts/ATContext";
import NoviaLogo from "@/components/ui/NoviaLogo";
import RosterColumn from "@/components/at/RosterColumn";
import EncounterColumn from "@/components/at/EncounterColumn";
import MainContentArea from "@/components/at/MainContentArea";

export default function ATDashboardLayout() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const currentUser = useQuery(
    api.users.getCurrent,
    session?.user?.id ? {} : "skip"
  );
  const organization = useQuery(api.organizations.getCurrent);

  // State for the 3-column layout
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<Id<"athletes"> | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<Id<"encounters"> | null>(null);
  const [viewMode, setViewMode] = useState<ATViewMode>("dashboard");

  // Show loading while checking auth
  if (isSessionPending || currentUser === undefined) {
    return <FullPageSpinner />;
  }

  // Check if user is logged in
  if (!session?.user?.id) {
    return <Navigate to="/login" replace />;
  }

  // Allow org_admin to view AT portal for testing purposes
  const allowedRoles = ["org_admin", "athletic_trainer", "physician"];
  if (currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/auth-router" replace />;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <ATContext.Provider
      value={{
        selectedTeamId,
        setSelectedTeamId,
        selectedAthleteId,
        setSelectedAthleteId,
        selectedEncounterId,
        setSelectedEncounterId,
        viewMode,
        setViewMode,
      }}
    >
      <div className="flex h-screen flex-col bg-slate-50">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <NoviaLogo className="h-7 w-auto" />
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {organization?.name || "Loading..."}
              </p>
              <p className="text-xs text-muted-foreground">Athletic Training EMR</p>
            </div>
            {/* Back to Admin for org_admin users */}
            {currentUser?.role === "org_admin" && (
              <>
                <div className="h-6 w-px bg-slate-200 ml-2" />
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                  <Link to="/org">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Admin Portal
                  </Link>
                </Button>
              </>
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

        {/* 3-Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Column 1: Roster */}
          <RosterColumn />

          {/* Column 2: Encounter History */}
          <EncounterColumn />

          {/* Column 3: Main Content Area */}
          <MainContentArea />
        </div>
      </div>
    </ATContext.Provider>
  );
}
