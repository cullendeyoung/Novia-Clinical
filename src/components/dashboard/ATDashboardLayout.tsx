import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, LayoutDashboard, Users, FileText } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { ATContext, type ATViewMode, type ATPage, type EncounterType } from "@/contexts/ATContext";
import NoviaLogo from "@/components/ui/NoviaLogo";
import MyDashboard from "@/components/at/MyDashboard";
import TeamOverview from "@/components/at/TeamOverview";
import EMRView from "@/components/at/EMRView";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { id: ATPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "my-dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { id: "team-overview", label: "Team Overview", icon: Users },
  { id: "emr", label: "EMR", icon: FileText },
];

export default function ATDashboardLayout() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const currentUser = useQuery(
    api.users.getCurrent,
    session?.user?.id ? {} : "skip"
  );
  const organization = useQuery(api.organizations.getCurrent);

  // Page navigation state
  const [currentPage, setCurrentPage] = useState<ATPage>("my-dashboard");

  // State for the EMR 3-column layout
  // We use a special "uninitialized" symbol to track when user hasn't made a selection yet
  const [selectedTeamIdState, setSelectedTeamIdState] = useState<Id<"teams"> | null | "uninitialized">("uninitialized");
  const [selectedAthleteId, setSelectedAthleteId] = useState<Id<"athletes"> | null>(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState<Id<"encounters"> | null>(null);
  const [viewMode, setViewMode] = useState<ATViewMode>("dashboard");
  const [preSelectedEncounterType, setPreSelectedEncounterType] = useState<EncounterType | null>(null);

  // Wrap setSelectedTeamId to handle user selections
  const setSelectedTeamId = (id: Id<"teams"> | null) => {
    setSelectedTeamIdState(id);
  };

  // Compute the effective selectedTeamId:
  // - If user has made a selection (state is not "uninitialized"), use that
  // - Otherwise, default to the user's fullTimeTeamId
  const selectedTeamId: Id<"teams"> | null =
    selectedTeamIdState === "uninitialized"
      ? (currentUser?.fullTimeTeamId ?? null)
      : selectedTeamIdState;

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

  const renderPage = () => {
    switch (currentPage) {
      case "my-dashboard":
        return <MyDashboard />;
      case "team-overview":
        return <TeamOverview />;
      case "emr":
        return <EMRView />;
      default:
        return <MyDashboard />;
    }
  };

  return (
    <ATContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        selectedTeamId,
        setSelectedTeamId,
        selectedAthleteId,
        setSelectedAthleteId,
        selectedEncounterId,
        setSelectedEncounterId,
        viewMode,
        setViewMode,
        preSelectedEncounterType,
        setPreSelectedEncounterType,
      }}
    >
      <div className="flex h-screen flex-col bg-slate-50">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
          {/* Left: Logo & Org Name */}
          <div className="flex items-center gap-4">
            <NoviaLogo className="h-7 w-auto" />
            <div className="h-6 w-px bg-slate-200" />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {organization?.name || "Loading..."}
              </p>
              <p className="text-xs text-muted-foreground">Athletic Training</p>
            </div>
            {/* Back to Admin for org_admin users */}
            {currentUser?.role === "org_admin" && (
              <>
                <div className="h-6 w-px bg-slate-200 ml-2 hidden sm:block" />
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground hidden sm:flex">
                  <Link to="/org">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Center: Navigation */}
          <nav className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  currentPage === item.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right: User & Sign Out */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {currentUser?.fullName || session?.user?.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex flex-1 overflow-hidden">
          {renderPage()}
        </div>
      </div>
    </ATContext.Provider>
  );
}
