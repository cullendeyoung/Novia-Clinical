import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ClipboardList,
  Search,
  ChevronRight,
  MessageSquare,
  Clock,
  Activity,
  FolderOpen,
  Receipt,
  User,
  ChevronDown,
  X,
  HelpCircle,
} from "lucide-react";
import NoviaLogo from "@/components/ui/NoviaLogo";
import { cn } from "@/lib/utils";

// PT Portal page types - top nav pages
type PTPage = "dashboard" | "patients" | "schedule" | "emr" | "documents" | "admin" | "settings";

// EMR sidebar navigation sections
type EMRSection = "overview" | "cases" | "encounters" | "documents" | "billing";

const NAV_ITEMS: { id: PTPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "emr", label: "EMR", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "admin", label: "Admin", icon: Building2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const EMR_SIDEBAR_ITEMS: { id: EMRSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "cases", label: "Cases", icon: FolderOpen },
  { id: "encounters", label: "Encounters", icon: ClipboardList },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "billing", label: "Billing", icon: Receipt },
];

// Mock patient data for demo
const MOCK_PATIENTS = [
  { id: "1", name: "Sarah Johnson", dob: "1985-03-15", lastVisit: "2024-01-10", status: "active" },
  { id: "2", name: "Michael Chen", dob: "1992-07-22", lastVisit: "2024-01-08", status: "active" },
  { id: "3", name: "Emily Rodriguez", dob: "1978-11-30", lastVisit: "2024-01-05", status: "active" },
  { id: "4", name: "James Wilson", dob: "1965-05-18", lastVisit: "2023-12-20", status: "discharged" },
];

export default function PTDashboardLayout() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [currentPage, setCurrentPage] = useState<PTPage>("dashboard");
  const [emrSection, setEmrSection] = useState<EMRSection>("overview");
  const [selectedPatient, setSelectedPatient] = useState<typeof MOCK_PATIENTS[0] | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

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

  const handlePatientSelect = (patient: typeof MOCK_PATIENTS[0]) => {
    setSelectedPatient(patient);
    setPatientSearch("");
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setEmrSection("overview");
  };

  const filteredPatients = MOCK_PATIENTS.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <ClinicHubDashboard userName={session?.user?.name || "Clinician"} />;
      case "patients":
        return <PTPatientsPlaceholder />;
      case "schedule":
        return <PTSchedulePlaceholder />;
      case "emr":
        return (
          <EMRView
            selectedPatient={selectedPatient}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            filteredPatients={filteredPatients}
            handlePatientSelect={handlePatientSelect}
            handleClearPatient={handleClearPatient}
            emrSection={emrSection}
            setEmrSection={setEmrSection}
          />
        );
      case "documents":
        return <PTDocumentsPlaceholder />;
      case "admin":
        return isAdmin ? <PTAdminPlaceholder /> : <NoAdminAccess />;
      case "settings":
        return <PTSettingsPlaceholder />;
      default:
        return <ClinicHubDashboard userName={session?.user?.name || "Clinician"} />;
    }
  };

  // EMR page uses different layout (no top nav padding, sidebar instead)
  if (currentPage === "emr") {
    return (
      <div className="flex h-screen flex-col bg-slate-50">
        {/* Minimal Top Header for EMR */}
        <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <NoviaLogo className="h-6 w-auto" />
            <div className="h-5 w-px bg-slate-200" />
            <button
              onClick={() => setCurrentPage("dashboard")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Clinic Hub
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {session?.user?.name || "PT User"}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* EMR Content with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {renderPage()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Top Header - Clinic Hub Style */}
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

        {/* Right: Help & User */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {session?.user?.name || "PT User"}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Back to Home Link */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Page Content */}
      <div className="flex flex-1 overflow-hidden">
        {renderPage()}
      </div>
    </div>
  );
}

// ============================================================================
// CLINIC HUB DASHBOARD - Based on first reference image
// ============================================================================

function ClinicHubDashboard({ userName }: { userName: string }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-slate-800 to-slate-700 text-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative px-8 py-12">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white mb-4">
            <Activity className="h-3 w-3 mr-1" />
            Clinic Portal
          </span>
          <h1 className="text-3xl font-bold">
            Welcome, {userName.split(' ')[0]}.
          </h1>
          <p className="mt-2 text-slate-300 max-w-xl">
            Manage your patients, access documentation, and view your schedule all in one place.
          </p>
        </div>
      </div>

      {/* Featured Card - Recent Activity or Highlighted Patient */}
      <div className="px-8 -mt-6 relative z-10">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                  <ClipboardList className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Today's Schedule
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      3 Appointments
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Next: Sarah Johnson at 10:30 AM • Follow-up Visit
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Button>
                <Button size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="px-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Patients</p>
                <p className="text-2xl font-bold text-slate-900">24</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Notes</p>
                <p className="text-2xl font-bold text-slate-900">3</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Messages</p>
                <p className="text-2xl font-bold text-slate-900">2 New</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Deadline</p>
                <p className="text-lg font-bold text-slate-900">Jan 15</p>
                <p className="text-xs text-muted-foreground">Insurance Auth</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="px-8 py-6 grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm">Add Patient</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              <span className="text-sm">New Note</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span className="text-sm">Schedule</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              <span className="text-sm">Open EMR</span>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: "Completed evaluation", patient: "Sarah Johnson", time: "2 hours ago" },
              { action: "Updated treatment plan", patient: "Michael Chen", time: "4 hours ago" },
              { action: "Signed progress note", patient: "Emily Rodriguez", time: "Yesterday" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.patient}</p>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground">
            View All Activity
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMR VIEW - Based on second reference image (left sidebar layout)
// ============================================================================

interface EMRViewProps {
  selectedPatient: typeof MOCK_PATIENTS[0] | null;
  patientSearch: string;
  setPatientSearch: (search: string) => void;
  filteredPatients: typeof MOCK_PATIENTS;
  handlePatientSelect: (patient: typeof MOCK_PATIENTS[0]) => void;
  handleClearPatient: () => void;
  emrSection: EMRSection;
  setEmrSection: (section: EMRSection) => void;
}

function EMRView({
  selectedPatient,
  patientSearch,
  setPatientSearch,
  filteredPatients,
  handlePatientSelect,
  handleClearPatient,
  emrSection,
  setEmrSection,
}: EMRViewProps) {
  return (
    <>
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
        {/* Patient Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Search Results Dropdown */}
          {patientSearch && (
            <div className="absolute z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
              {filteredPatients.length > 0 ? (
                <div className="py-1">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-medium">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">DOB: {patient.dob}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No patients found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Patient Info */}
        {selectedPatient ? (
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Selected Patient
              </span>
              <button
                onClick={handleClearPatient}
                className="text-muted-foreground hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                {selectedPatient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-slate-900">{selectedPatient.name}</p>
                <p className="text-xs text-muted-foreground">DOB: {selectedPatient.dob}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-slate-200 bg-amber-50">
            <p className="text-sm text-amber-800">
              Search for a patient above to view their records.
            </p>
          </div>
        )}

        {/* EMR Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="mb-2 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Patient Records
            </span>
          </div>
          {EMR_SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => selectedPatient && setEmrSection(item.id)}
              disabled={!selectedPatient}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                emrSection === item.id && selectedPatient
                  ? "bg-blue-50 text-blue-700"
                  : selectedPatient
                  ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  : "text-slate-400 cursor-not-allowed"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {emrSection === item.id && selectedPatient && (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </button>
          ))}

          {/* Additional Sections */}
          <div className="mt-6 mb-2 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tools
            </span>
          </div>
          <button
            disabled={!selectedPatient}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              selectedPatient
                ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                : "text-slate-400 cursor-not-allowed"
            )}
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </button>
          <button
            disabled={!selectedPatient}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              selectedPatient
                ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                : "text-slate-400 cursor-not-allowed"
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Message Patient
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {selectedPatient ? (
          <EMRContent patient={selectedPatient} section={emrSection} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mx-auto mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Select a Patient
              </h2>
              <p className="text-muted-foreground">
                Use the search bar to find and select a patient to view their electronic medical records.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// EMR Content based on selected section
function EMRContent({ patient, section }: { patient: typeof MOCK_PATIENTS[0]; section: EMRSection }) {
  return (
    <div className="p-6">
      {/* Patient Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{patient.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>DOB: {patient.dob}</span>
                <span>•</span>
                <span>ID: PT-{patient.id.padStart(5, '0')}</span>
                <span>•</span>
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  patient.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                )}>
                  {patient.status === "active" ? "Active" : "Discharged"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <ChevronDown className="h-4 w-4 mr-2" />
              Actions
            </Button>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>
      </div>

      {/* Section Content */}
      {section === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Patient Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium">(555) 123-4567</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{patient.name.toLowerCase().replace(' ', '.')}@email.com</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-muted-foreground">Insurance</span>
                <span className="text-sm font-medium">Blue Cross Blue Shield</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">Last Visit</span>
                <span className="text-sm font-medium">{patient.lastVisit}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Active Cases</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-900">Low Back Pain</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
                </div>
                <p className="text-xs text-muted-foreground">Started: Dec 15, 2023 • 6 visits</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground">
              View All Cases
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {section === "cases" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Episodes of Care</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900">Low Back Pain - Lumbar Disc Herniation</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">ICD-10: M51.16</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Started: Dec 15, 2023</span>
                <span>•</span>
                <span>6 visits</span>
                <span>•</span>
                <span>Auth: 12 visits remaining</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {section === "encounters" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Encounters</h3>
            <Button size="sm">
              <FileText className="h-4 w-4 mr-2" />
              New Encounter
            </Button>
          </div>
          <div className="space-y-3">
            {[
              { type: "Follow-up", date: "Jan 10, 2024", provider: "Dr. Smith", status: "Signed" },
              { type: "Follow-up", date: "Jan 3, 2024", provider: "Dr. Smith", status: "Signed" },
              { type: "Initial Evaluation", date: "Dec 15, 2023", provider: "Dr. Smith", status: "Signed" },
            ].map((enc, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{enc.type}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{enc.date} • {enc.provider}</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{enc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === "documents" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Documents</h3>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <Button variant="outline" className="mt-4">Upload Document</Button>
          </div>
        </div>
      )}

      {section === "billing" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Billing & Insurance</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50">
              <h4 className="font-medium text-slate-900 mb-2">Primary Insurance</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Provider</span>
                <span>Blue Cross Blue Shield</span>
                <span className="text-muted-foreground">Member ID</span>
                <span>BCBS123456789</span>
                <span className="text-muted-foreground">Group #</span>
                <span>GRP001</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PLACEHOLDER COMPONENTS
// ============================================================================

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
