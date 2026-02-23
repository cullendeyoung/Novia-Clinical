import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import { LogOut, Home, Activity, Dumbbell, FileText, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import NoviaLogo from "@/components/ui/NoviaLogo";
import { cn } from "@/lib/utils";

// Athlete portal pages
type AthletePage = "home" | "injuries" | "rehab" | "documents" | "profile";

const NAV_ITEMS: { id: AthletePage; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "injuries", label: "My Injuries", icon: Activity },
  { id: "rehab", label: "Rehab Programs", icon: Dumbbell },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "profile", label: "My Profile", icon: User },
];

// Lazy load page components
import AthleteHome from "@/components/athlete/AthleteHome";
import AthleteMyInjuries from "@/components/athlete/AthleteMyInjuries";
import AthleteMyRehab from "@/components/athlete/AthleteMyRehab";
import AthleteMyDocuments from "@/components/athlete/AthleteMyDocuments";
import AthleteMyProfile from "@/components/athlete/AthleteMyProfile";

export default function AthleteDashboardLayout() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const currentUser = useQuery(
    api.users.getCurrent,
    session?.user?.id ? {} : "skip"
  );
  const athleteProfile = useQuery(
    api.athletePortal.getMyProfile,
    session?.user?.id && currentUser?.role === "athlete" ? {} : "skip"
  );

  const [currentPage, setCurrentPage] = useState<AthletePage>("home");

  // Show loading while checking auth
  if (isSessionPending || currentUser === undefined) {
    return <FullPageSpinner />;
  }

  // Check if user is logged in
  if (!session?.user?.id) {
    return <Navigate to="/login" replace />;
  }

  // Only athletes can access this portal (allow org_admin for dev preview)
  const isDevPreview = currentUser && (currentUser.role === "org_admin" || currentUser.role === "athletic_trainer");
  if (currentUser && currentUser.role !== "athlete" && !isDevPreview) {
    return <Navigate to="/auth-router" replace />;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <AthleteHome />;
      case "injuries":
        return <AthleteMyInjuries />;
      case "rehab":
        return <AthleteMyRehab />;
      case "documents":
        return <AthleteMyDocuments />;
      case "profile":
        return <AthleteMyProfile />;
      default:
        return <AthleteHome />;
    }
  };

  // Get display name
  const displayName = athleteProfile
    ? athleteProfile.preferredName || athleteProfile.firstName
    : currentUser?.fullName || session?.user?.name;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
        {/* Left: Logo & Team Name */}
        <div className="flex items-center gap-4">
          <NoviaLogo className="h-7 w-auto" />
          <div className="h-6 w-px bg-slate-200" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">
              {athleteProfile?.teamName || "Loading..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {athleteProfile?.orgName || "Athlete Portal"}
            </p>
          </div>
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
              <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: User & Sign Out */}
        <div className="flex items-center gap-3">
          {/* Back to AT button for dev preview */}
          {isDevPreview && (
            <Button asChild variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50">
              <Link to="/at">
                <ArrowLeft className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Back to AT</span>
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {displayName}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto">
        {renderPage()}
      </div>
    </div>
  );
}
