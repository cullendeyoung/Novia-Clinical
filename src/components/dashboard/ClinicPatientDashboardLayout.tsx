import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  ArrowLeft,
  LayoutDashboard,
  FileText,
  Calendar,
  User,
  MessageSquare,
} from "lucide-react";
import NoviaLogo from "@/components/ui/NoviaLogo";
import { cn } from "@/lib/utils";

// Patient Portal page types
type PatientPage = "home" | "appointments" | "documents" | "messages" | "profile";

const NAV_ITEMS: { id: PatientPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "profile", label: "My Profile", icon: User },
];

export default function ClinicPatientDashboardLayout() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [currentPage, setCurrentPage] = useState<PatientPage>("home");

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
      case "home":
        return <PatientHome />;
      case "appointments":
        return <PatientAppointments />;
      case "documents":
        return <PatientDocuments />;
      case "messages":
        return <PatientMessages />;
      case "profile":
        return <PatientProfile />;
      default:
        return <PatientHome />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
        {/* Left: Logo & Portal Name */}
        <div className="flex items-center gap-4">
          <NoviaLogo className="h-7 w-auto" />
          <div className="h-6 w-px bg-slate-200" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">
              Patient Portal
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
            {session?.user?.name || "Patient"}
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

// Placeholder components

function PatientHome() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Welcome to Your Patient Portal
        </h1>
        <p className="mt-1 text-muted-foreground">
          View your appointments, documents, and communicate with your care team.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Appointment</p>
              <p className="font-semibold text-slate-900">None scheduled</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            View All Appointments
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="font-semibold text-slate-900">0 available</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            View Documents
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Messages</p>
              <p className="font-semibold text-slate-900">0 unread</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            View Messages
          </Button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Your Care Team</h2>
        <div className="text-center py-8">
          <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-muted-foreground">No care team assigned yet</p>
        </div>
      </div>
    </div>
  );
}

function PatientAppointments() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        My Appointments
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">No appointments scheduled</p>
      </div>
    </div>
  );
}

function PatientDocuments() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        My Documents
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">No documents available</p>
      </div>
    </div>
  );
}

function PatientMessages() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        Messages
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">No messages</p>
      </div>
    </div>
  );
}

function PatientProfile() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <h1 className="font-heading text-2xl font-semibold text-slate-900 mb-4">
        My Profile
      </h1>
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-muted-foreground">Profile management coming soon</p>
      </div>
    </div>
  );
}
