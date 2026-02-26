import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  TrendingUp,
  Activity,
  UserCheck,
  UserX,
  User,
} from "lucide-react";

// Mock data until backend is connected
const MOCK_INJURY_STATS = {
  totalPatients: 47,
  totalCases: 62,
  topInjuries: [
    { diagnosis: "Low Back Pain", count: 14, percentage: 23, color: "#3B82F6" },
    { diagnosis: "Rotator Cuff Injury", count: 11, percentage: 18, color: "#8B5CF6" },
    { diagnosis: "ACL Reconstruction", count: 9, percentage: 15, color: "#10B981" },
    { diagnosis: "Lateral Epicondylitis", count: 7, percentage: 11, color: "#F59E0B" },
    { diagnosis: "Cervical Strain", count: 6, percentage: 10, color: "#EF4444" },
    { diagnosis: "Other", count: 15, percentage: 24, color: "#94A3B8" },
  ],
};

// Mock clinicians in the practice
const MOCK_CLINICIANS = [
  { id: "1", name: "Dr. Martinez", type: "Physical Therapist" },
  { id: "2", name: "Dr. Thompson", type: "Physical Therapist" },
  { id: "3", name: "Dr. Kim", type: "Chiropractor" },
  { id: "4", name: "Dr. Patel", type: "Physician" },
];

// Current logged-in clinician (mock)
const CURRENT_CLINICIAN_ID = "1";
const CURRENT_CLINICIAN_NAME = "Dr. Martinez";

const MOCK_PATIENTS = [
  {
    id: "1",
    firstName: "Sarah",
    lastName: "Johnson",
    status: "active" as const,
    activeCase: { diagnosis: "Lumbar Disc Herniation" },
    lastVisitDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
    lastVisitType: "follow_up",
    assignedClinicianId: "1",
    assignedClinicianName: "Dr. Martinez",
    nextAppointment: Date.now() + 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: "2",
    firstName: "Michael",
    lastName: "Chen",
    status: "active" as const,
    activeCase: { diagnosis: "Rotator Cuff Tear - R" },
    lastVisitDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
    lastVisitType: "re_evaluation",
    assignedClinicianId: "2",
    assignedClinicianName: "Dr. Thompson",
    nextAppointment: Date.now() + 5 * 24 * 60 * 60 * 1000,
  },
  {
    id: "3",
    firstName: "Emily",
    lastName: "Rodriguez",
    status: "active" as const,
    activeCase: { diagnosis: "ACL Reconstruction - L" },
    lastVisitDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
    lastVisitType: "follow_up",
    assignedClinicianId: "1",
    assignedClinicianName: "Dr. Martinez",
  },
  {
    id: "4",
    firstName: "James",
    lastName: "Wilson",
    status: "active" as const,
    activeCase: { diagnosis: "Cervical Radiculopathy" },
    lastVisitDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
    lastVisitType: "initial_evaluation",
    assignedClinicianId: "3",
    assignedClinicianName: "Dr. Kim",
    nextAppointment: Date.now() + 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: "5",
    firstName: "Amanda",
    lastName: "Davis",
    status: "active" as const,
    activeCase: { diagnosis: "Lateral Epicondylitis - R" },
    lastVisitDate: Date.now() - 4 * 24 * 60 * 60 * 1000,
    lastVisitType: "follow_up",
    assignedClinicianId: "2",
    assignedClinicianName: "Dr. Thompson",
  },
  {
    id: "6",
    firstName: "Robert",
    lastName: "Brown",
    status: "active" as const,
    activeCase: { diagnosis: "Plantar Fasciitis - L" },
    lastVisitDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
    lastVisitType: "follow_up",
    assignedClinicianId: "4",
    assignedClinicianName: "Dr. Patel",
    nextAppointment: Date.now() + 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: "7",
    firstName: "Jennifer",
    lastName: "Martinez",
    status: "active" as const,
    activeCase: { diagnosis: "Shoulder Impingement - R" },
    lastVisitDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
    lastVisitType: "re_evaluation",
    assignedClinicianId: "1",
    assignedClinicianName: "Dr. Martinez",
    nextAppointment: Date.now() + 4 * 24 * 60 * 60 * 1000,
  },
];

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatVisitType(type: string): string {
  const labels: Record<string, string> = {
    initial_evaluation: "Initial Eval",
    follow_up: "Follow-up",
    re_evaluation: "Re-eval",
    discharge: "Discharge",
    progress_note: "Progress",
  };
  return labels[type] || type;
}

// Calculate pie chart paths outside component render
function calculatePiePaths(data: typeof MOCK_INJURY_STATS.topInjuries) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const { paths } = data.reduce<{ paths: Array<{ d: string; color: string }>; currentAngle: number }>(
    (acc, item) => {
      const angle = (item.count / total) * 360;
      const startAngle = acc.currentAngle;
      const endAngle = acc.currentAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = 50 + 40 * Math.cos(startRad);
      const y1 = 50 + 40 * Math.sin(startRad);
      const x2 = 50 + 40 * Math.cos(endRad);
      const y2 = 50 + 40 * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const pathD = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return {
        paths: [...acc.paths, { d: pathD, color: item.color }],
        currentAngle: endAngle,
      };
    },
    { paths: [], currentAngle: -90 }
  );

  return { paths, total };
}

// Simple SVG Pie Chart
function PieChart({ data }: { data: typeof MOCK_INJURY_STATS.topInjuries }) {
  const { paths, total } = useMemo(() => calculatePiePaths(data), [data]);

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {paths.map((p, index) => (
        <path
          key={index}
          d={p.d}
          fill={p.color}
          className="transition-opacity hover:opacity-80"
        />
      ))}
      {/* Inner circle for donut effect */}
      <circle cx="50" cy="50" r="24" fill="white" />
      {/* Center text */}
      <text
        x="50"
        y="47"
        textAnchor="middle"
        className="text-xs font-bold fill-slate-900"
      >
        {total}
      </text>
      <text
        x="50"
        y="57"
        textAnchor="middle"
        className="text-[6px] fill-slate-500"
      >
        cases
      </text>
    </svg>
  );
}

type ViewMode = "clinic" | "my_patients";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("clinic");
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>("all");

  // Filter patients by view mode, clinician, and search
  const filteredPatients = useMemo(() => {
    return MOCK_PATIENTS.filter((p) => {
      // First filter by view mode
      if (viewMode === "my_patients") {
        if (p.assignedClinicianId !== CURRENT_CLINICIAN_ID) return false;
      } else if (selectedClinicianId !== "all") {
        if (p.assignedClinicianId !== selectedClinicianId) return false;
      }

      // Then filter by search
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        p.activeCase?.diagnosis.toLowerCase().includes(query)
      );
    });
  }, [viewMode, selectedClinicianId, searchQuery]);

  const stats = MOCK_INJURY_STATS;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Patients
          </h1>
          <p className="mt-1 text-muted-foreground">
            {viewMode === "clinic"
              ? "Clinic-wide patient overview and analytics"
              : `${CURRENT_CLINICIAN_NAME}'s patients`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => {
                setViewMode("clinic");
                setSelectedClinicianId("all");
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === "clinic"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Users className="w-4 h-4" />
              Clinic Patients
            </button>
            <button
              onClick={() => {
                setViewMode("my_patients");
                setSelectedClinicianId("all");
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === "my_patients"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <User className="w-4 h-4" />
              My Patients
            </button>
          </div>

          {/* Clinician Filter (only in clinic view) */}
          {viewMode === "clinic" && (
            <select
              value={selectedClinicianId}
              onChange={(e) => setSelectedClinicianId(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clinicians</option>
              {MOCK_CLINICIANS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Stats Overview Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalPatients}</p>
              <p className="text-xs text-slate-500">Total Patients</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {MOCK_PATIENTS.filter((p) => p.status === "active").length}
              </p>
              <p className="text-xs text-slate-500">Active Patients</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalCases}</p>
              <p className="text-xs text-slate-500">Total Cases</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">85%</p>
              <p className="text-xs text-slate-500">Avg. Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Injury Analytics - Pie Chart + List */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">
            Injury Types Across Clinic
          </h3>

          <div className="flex gap-4">
            {/* Pie Chart */}
            <div className="w-32 h-32 flex-shrink-0">
              <PieChart data={stats.topInjuries} />
            </div>

            {/* Legend List */}
            <div className="flex-1 space-y-2">
              {stats.topInjuries.map((injury, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: injury.color }}
                  />
                  <span className="text-sm text-slate-700 flex-1 truncate">
                    {injury.diagnosis}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {injury.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              Showing injury distribution from all {stats.totalCases} cases
            </p>
          </div>
        </div>

        {/* Current Patients List */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              {viewMode === "my_patients"
                ? "My Patients"
                : selectedClinicianId !== "all"
                  ? `${MOCK_CLINICIANS.find((c) => c.id === selectedClinicianId)?.name}'s Patients`
                  : "All Clinic Patients"}
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>

          {/* Patient List */}
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                        {patient.firstName[0]}
                        {patient.lastName[0]}
                      </div>

                      {/* Patient Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              patient.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {patient.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {patient.activeCase?.diagnosis || "No active case"}
                        </p>
                      </div>
                    </div>

                    {/* Visit Info */}
                    <div className="flex items-center gap-6">
                      {/* Last Visit */}
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Last Visit</p>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {patient.lastVisitDate
                              ? formatDate(patient.lastVisitDate)
                              : "—"}
                          </span>
                          {patient.lastVisitType && (
                            <span className="text-xs text-slate-400">
                              ({formatVisitType(patient.lastVisitType)})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Next Appointment */}
                      <div className="text-right min-w-[100px]">
                        <p className="text-xs text-slate-400">Next Appt</p>
                        <div className="flex items-center gap-1.5 text-sm">
                          {patient.nextAppointment ? (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-blue-600 font-medium">
                                {formatDate(patient.nextAppointment)}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">Not scheduled</span>
                          )}
                        </div>
                      </div>

                      {/* Assigned Clinician */}
                      <div className="text-right min-w-[100px]">
                        <p className="text-xs text-slate-400">Clinician</p>
                        <p className="text-sm text-slate-600">
                          {patient.assignedClinicianName || "Unassigned"}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-500">
                  {searchQuery ? "No patients match your search" : "No active patients"}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredPatients.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {filteredPatients.length} active patient
                {filteredPatients.length !== 1 ? "s" : ""}
              </p>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                View All Patients →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recently Discharged Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Recently Cleared/Discharged</h3>
          <span className="text-xs text-slate-500">Last 30 days</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { name: "Robert Taylor", diagnosis: "Ankle Sprain - R", date: "Jan 15" },
            { name: "Lisa Anderson", diagnosis: "TMJ Dysfunction", date: "Jan 12" },
            { name: "David Kim", diagnosis: "Post-op Knee", date: "Jan 10" },
            { name: "Jennifer White", diagnosis: "Carpal Tunnel", date: "Jan 8" },
          ].map((patient, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-4 h-4 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">{patient.name}</p>
              </div>
              <p className="text-xs text-slate-500">{patient.diagnosis}</p>
              <p className="text-xs text-slate-400 mt-1">Discharged {patient.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
