import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
} from "lucide-react";

// Types
type ViewMode = "clinic" | "individual";
type CalendarView = "day" | "week";

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  clinicianId: string;
  clinicianName: string;
  scheduledStart: number;
  scheduledEnd: number;
  durationMinutes: number;
  appointmentType: string;
  status: "scheduled" | "confirmed" | "checked_in" | "in_progress" | "completed" | "cancelled";
  notes?: string;
}

interface Clinician {
  id: string;
  name: string;
  color: string;
  clinicianType: string;
}

// Mock data
const MOCK_CLINICIANS: Clinician[] = [
  { id: "1", name: "Dr. Martinez", color: "#3B82F6", clinicianType: "Physical Therapist" },
  { id: "2", name: "Dr. Thompson", color: "#8B5CF6", clinicianType: "Physical Therapist" },
  { id: "3", name: "Dr. Kim", color: "#10B981", clinicianType: "Chiropractor" },
  { id: "4", name: "Dr. Patel", color: "#F59E0B", clinicianType: "Physician" },
];

const generateMockAppointments = (): Appointment[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const appointments: Appointment[] = [];

  // Generate appointments for the week
  for (let day = 0; day < 5; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);

    MOCK_CLINICIANS.forEach((clinician, clinIndex) => {
      // Each clinician has 3-5 appointments per day
      const numAppts = 3 + Math.floor(Math.random() * 3);
      let currentHour = 9;

      for (let i = 0; i < numAppts; i++) {
        const duration = [30, 45, 60][Math.floor(Math.random() * 3)];
        const startTime = new Date(date);
        startTime.setHours(currentHour, 0, 0, 0);

        appointments.push({
          id: `${day}-${clinIndex}-${i}`,
          patientName: [
            "Sarah Johnson",
            "Michael Chen",
            "Emily Rodriguez",
            "James Wilson",
            "Amanda Davis",
            "Robert Taylor",
            "Lisa Anderson",
            "David Kim",
          ][Math.floor(Math.random() * 8)],
          patientId: `patient-${i}`,
          clinicianId: clinician.id,
          clinicianName: clinician.name,
          scheduledStart: startTime.getTime(),
          scheduledEnd: startTime.getTime() + duration * 60 * 1000,
          durationMinutes: duration,
          appointmentType: ["follow_up", "initial_evaluation", "re_evaluation"][
            Math.floor(Math.random() * 3)
          ],
          status: ["scheduled", "confirmed", "checked_in"][Math.floor(Math.random() * 3)] as Appointment["status"],
        });

        currentHour += Math.ceil(duration / 60) + (Math.random() > 0.5 ? 1 : 0);
        if (currentHour > 16) break;
      }
    });
  }

  return appointments;
};

const MOCK_APPOINTMENTS = generateMockAppointments();

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8 AM to 5 PM

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatAppointmentType(type: string): string {
  const labels: Record<string, string> = {
    initial_evaluation: "Initial Eval",
    follow_up: "Follow-up",
    re_evaluation: "Re-eval",
    discharge: "Discharge",
    consultation: "Consultation",
  };
  return labels[type] || type;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: "bg-slate-100 text-slate-700",
    confirmed: "bg-blue-100 text-blue-700",
    checked_in: "bg-amber-100 text-amber-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return colors[status] || "bg-slate-100 text-slate-700";
}

// Day View Component
function DayView({
  date,
  appointments,
  clinicians,
  viewMode,
  selectedClinicianId,
}: {
  date: Date;
  appointments: Appointment[];
  clinicians: Clinician[];
  viewMode: ViewMode;
  selectedClinicianId?: string;
}) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // Filter appointments for this day
  const dayAppointments = appointments.filter(
    (a) => a.scheduledStart >= dayStart.getTime() && a.scheduledStart < dayEnd.getTime()
  );

  // In clinic view, show all clinicians side by side
  // In individual view, show only selected clinician
  const displayClinicians =
    viewMode === "clinic"
      ? clinicians
      : clinicians.filter((c) => c.id === selectedClinicianId);

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Clinician Headers */}
        {viewMode === "clinic" && (
          <div className="flex border-b border-slate-200">
            <div className="w-20 flex-shrink-0" /> {/* Time column spacer */}
            {displayClinicians.map((clinician) => (
              <div
                key={clinician.id}
                className="flex-1 px-3 py-2 text-center border-l border-slate-200"
              >
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: clinician.color }}
                  />
                  <span className="text-sm font-medium text-slate-900">
                    {clinician.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{clinician.clinicianType}</p>
              </div>
            ))}
          </div>
        )}

        {/* Time Grid */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div key={hour} className="flex border-b border-slate-100" style={{ height: "80px" }}>
              {/* Time Label */}
              <div className="w-20 flex-shrink-0 text-xs text-slate-400 text-right pr-3 pt-1">
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>

              {/* Clinician Columns */}
              {displayClinicians.map((clinician) => (
                <div
                  key={clinician.id}
                  className="flex-1 border-l border-slate-100 relative"
                >
                  {/* Render appointments in this hour for this clinician */}
                  {dayAppointments
                    .filter((a) => {
                      const appointmentHour = new Date(a.scheduledStart).getHours();
                      return a.clinicianId === clinician.id && appointmentHour === hour;
                    })
                    .map((apt) => {
                      const startMinutes = new Date(apt.scheduledStart).getMinutes();
                      const topOffset = (startMinutes / 60) * 80;
                      const height = (apt.durationMinutes / 60) * 80;

                      return (
                        <div
                          key={apt.id}
                          className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                          style={{
                            top: `${topOffset}px`,
                            height: `${Math.max(height - 4, 24)}px`,
                            backgroundColor: `${clinician.color}15`,
                            borderLeft: `3px solid ${clinician.color}`,
                          }}
                        >
                          <p
                            className="text-xs font-medium truncate"
                            style={{ color: clinician.color }}
                          >
                            {apt.patientName}
                          </p>
                          {height > 30 && (
                            <p className="text-[10px] text-slate-500 truncate">
                              {formatTime(apt.scheduledStart)} •{" "}
                              {formatAppointmentType(apt.appointmentType)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  startDate,
  appointments,
  clinicians,
  selectedClinicianId,
}: {
  startDate: Date;
  appointments: Appointment[];
  clinicians: Clinician[];
  selectedClinicianId?: string;
}) {
  const days = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  const filteredAppointments = selectedClinicianId
    ? appointments.filter((a) => a.clinicianId === selectedClinicianId)
    : appointments;

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Day Headers */}
        <div className="flex border-b border-slate-200">
          <div className="w-20 flex-shrink-0" />
          {days.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex-1 px-3 py-3 text-center border-l border-slate-200",
                  isToday && "bg-blue-50"
                )}
              >
                <p className="text-xs text-slate-500 uppercase">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p
                  className={cn(
                    "text-lg font-semibold",
                    isToday ? "text-blue-600" : "text-slate-900"
                  )}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div key={hour} className="flex border-b border-slate-100" style={{ height: "60px" }}>
              <div className="w-20 flex-shrink-0 text-xs text-slate-400 text-right pr-3 pt-1">
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>

              {days.map((day) => {
                const dayStart = new Date(day);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);

                const hourAppointments = filteredAppointments.filter((a) => {
                  const aptDate = new Date(a.scheduledStart);
                  return (
                    a.scheduledStart >= dayStart.getTime() &&
                    a.scheduledStart < dayEnd.getTime() &&
                    aptDate.getHours() === hour
                  );
                });

                return (
                  <div key={day.toISOString()} className="flex-1 border-l border-slate-100 relative">
                    {hourAppointments.map((apt) => {
                      const clinician = clinicians.find((c) => c.id === apt.clinicianId);
                      const startMinutes = new Date(apt.scheduledStart).getMinutes();
                      const topOffset = (startMinutes / 60) * 60;

                      return (
                        <div
                          key={apt.id}
                          className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 cursor-pointer hover:opacity-90 transition-opacity text-[10px] truncate"
                          style={{
                            top: `${topOffset}px`,
                            backgroundColor: `${clinician?.color || "#94A3B8"}20`,
                            borderLeft: `2px solid ${clinician?.color || "#94A3B8"}`,
                          }}
                        >
                          <span style={{ color: clinician?.color }}>{apt.patientName}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Upcoming Appointments Sidebar
function UpcomingAppointments({ appointments }: { appointments: Appointment[] }) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = useMemo(() => {
    return appointments
      .filter((a) => a.scheduledStart > currentTime && a.status !== "cancelled")
      .sort((a, b) => a.scheduledStart - b.scheduledStart)
      .slice(0, 5);
  }, [appointments, currentTime]);

  return (
    <div className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto">
      <h3 className="font-semibold text-slate-900 mb-4">Upcoming Today</h3>

      {upcoming.length > 0 ? (
        <div className="space-y-3">
          {upcoming.map((apt) => (
            <div
              key={apt.id}
              className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-900">{apt.patientName}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", getStatusColor(apt.status))}>
                  {apt.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(apt.scheduledStart)}
                </span>
                <span>{apt.durationMinutes} min</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {formatAppointmentType(apt.appointmentType)} • {apt.clinicianName}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-8">No upcoming appointments</p>
      )}

      <Button variant="outline" className="w-full mt-4" size="sm">
        <Plus className="w-4 h-4 mr-1" />
        New Appointment
      </Button>
    </div>
  );
}

export default function Schedule() {
  const [viewMode, setViewMode] = useState<ViewMode>("clinic");
  const [calendarView, setCalendarView] = useState<CalendarView>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClinicianId, setSelectedClinicianId] = useState<string | undefined>(
    MOCK_CLINICIANS[0].id
  );
  const [showAddModal, setShowAddModal] = useState(false);

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (calendarView === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Schedule</h1>
            <p className="text-sm text-slate-500">
              {viewMode === "clinic" ? "Clinic-wide schedule" : "My appointments"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("clinic")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  viewMode === "clinic"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Users className="w-4 h-4" />
                Clinic
              </button>
              <button
                onClick={() => setViewMode("individual")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  viewMode === "individual"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <User className="w-4 h-4" />
                My Schedule
              </button>
            </div>

            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Appointment
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <span className="ml-2 text-lg font-medium text-slate-900">
              {calendarView === "day"
                ? currentDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : `Week of ${currentDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Clinician Filter (for individual view) */}
            {viewMode === "individual" && (
              <select
                value={selectedClinicianId}
                onChange={(e) => setSelectedClinicianId(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {MOCK_CLINICIANS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Calendar View Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setCalendarView("day")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  calendarView === "day"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Day
              </button>
              <button
                onClick={() => setCalendarView("week")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  calendarView === "week"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Week
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar View */}
        <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full">
              {calendarView === "day" ? (
                <DayView
                  date={currentDate}
                  appointments={MOCK_APPOINTMENTS}
                  clinicians={MOCK_CLINICIANS}
                  viewMode={viewMode}
                  selectedClinicianId={selectedClinicianId}
                />
              ) : (
                <WeekView
                  startDate={currentDate}
                  appointments={MOCK_APPOINTMENTS}
                  clinicians={MOCK_CLINICIANS}
                  selectedClinicianId={viewMode === "individual" ? selectedClinicianId : undefined}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <UpcomingAppointments appointments={MOCK_APPOINTMENTS} />
      </div>

      {/* Add Appointment Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Appointment</h2>
            <p className="text-sm text-slate-600 mb-4">
              Appointment scheduling form will be implemented here.
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
