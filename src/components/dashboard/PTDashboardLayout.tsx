import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  ArrowLeft,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Calendar,
  Building2,
  Lock,
} from "lucide-react";
import NoviaLogo from "@/components/ui/NoviaLogo";
import { cn } from "@/lib/utils";

// PT Portal page types
type PTPage = "dashboard" | "patients" | "schedule" | "documents" | "admin" | "settings";

const NAV_ITEMS: { id: PTPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "admin", label: "Admin", icon: Building2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function PTDashboardLayout() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [currentPage, setCurrentPage] = useState<PTPage>("dashboard");

  // For now, we'll use a simple flag to simulate admin access
  // In production, this would come from the practiceUsers table
  const isAdmin = true; // Temporary - all users have admin access for dev

  // Show loading while checking auth
  if (isSessionPending) {
    return <FullPageSpinner />;
  }

  // Check if user is logged in
  if (!session?.user?.id) {
    return <Navigate to="/login" replace />;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <PTDashboard />;
      case "patients":
        return <PTPatientsPlaceholder />;
      case "schedule":
        return <PTSchedulePlaceholder />;
      case "documents":
        return <PTDocumentsPlaceholder />;
      case "admin":
        return isAdmin ? <PTAdminPlaceholder /> : <NoAdminAccess />;
      case "settings":
        return <PTSettingsPlaceholder />;
      default:
        return <PTDashboard />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
        {/* Left: Logo & Practice Name */}
        <div className="flex items-center gap-4">
          <NoviaLogo className="h-7 w-auto" />
          <div className="h-6 w-px bg-slate-200" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">
              Physical Therapy Portal
            </p>
            <p className="text-xs text-muted-foreground">Demo Practice</p>
          </div>
          {/* Back to Home */}
          <div className="h-6 w-px bg-slate-200 ml-2 hidden sm:block" />
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hidden sm:flex">
            <Link to="/">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Home
            </Link>
          </Button>
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
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {session?.user?.name || "PT User"}
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
  );
}

// Placeholder components - will be built out

function PTDashboard() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Welcome to the PT Portal
        </h1>
        <p className="mt-1 text-muted-foreground">
          This is a placeholder for the Physical Therapy clinician dashboard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Patients</p>
              <p className="text-2xl font-semibold">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Calendar className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Appointments</p>
              <p className="text-2xl font-semibold">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Notes This Week</p>
              <p className="text-2xl font-semibold">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            New Note
          </Button>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Appointment
          </Button>
        </div>
      </div>
    </div>
  );
}

function PTPatientsPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Patients
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">Patient management coming soon</p>
      </div>
    </div>
  );
}

function PTSchedulePlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Schedule
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">Scheduling coming soon</p>
      </div>
    </div>
  );
}

function PTDocumentsPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Documents
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">Document management coming soon</p>
      </div>
    </div>
  );
}

function PTAdminPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Practice Administration
      </h1>
      <p className="text-muted-foreground mb-6">
        Manage your practice settings, clinicians, and billing.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 cursor-pointer transition-colors">
          <Building2 className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-slate-900">Practice Info</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Update practice details, address, and contact info
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 cursor-pointer transition-colors">
          <Users className="h-8 w-8 text-emerald-600 mb-3" />
          <h3 className="font-semibold text-slate-900">Clinicians</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage clinicians and staff access
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300 cursor-pointer transition-colors">
          <FileText className="h-8 w-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-slate-900">Billing</h3>
          <p className="text-sm text-muted-foreground mt-1">
            View invoices and manage subscription
          </p>
        </div>
      </div>
    </div>
  );
}

function PTSettingsPlaceholder() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Settings
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <Settings className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">User settings coming soon</p>
      </div>
    </div>
  );
}

function NoAdminAccess() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center max-w-md">
          <Lock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Admin Access Required
          </h2>
          <p className="text-muted-foreground">
            You do not have admin access. Please contact your practice administrator
            if you need access to this section.
          </p>
        </div>
      </div>
    </div>
  );
}
