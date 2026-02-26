import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Phone,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarPlus,
} from "lucide-react";

interface Appointment {
  id: string;
  scheduledStart: number;
  scheduledEnd: number;
  durationMinutes: number;
  appointmentType: string;
  title?: string;
  status: "scheduled" | "confirmed" | "checked_in" | "in_progress" | "completed" | "cancelled";
  clinicianName: string;
  clinicianType?: string;
  notes?: string;
  isUpcoming: boolean;
  location?: string;
  isVirtual?: boolean;
}

// Mock data for patient's appointments
const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "1",
    scheduledStart: Date.now() + 2 * 24 * 60 * 60 * 1000,
    scheduledEnd: Date.now() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000,
    durationMinutes: 45,
    appointmentType: "follow_up",
    status: "confirmed",
    clinicianName: "Dr. Martinez",
    clinicianType: "Physical Therapist",
    isUpcoming: true,
    location: "Suite 200, Room 3",
  },
  {
    id: "2",
    scheduledStart: Date.now() + 9 * 24 * 60 * 60 * 1000,
    scheduledEnd: Date.now() + 9 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000,
    durationMinutes: 30,
    appointmentType: "follow_up",
    status: "scheduled",
    clinicianName: "Dr. Martinez",
    clinicianType: "Physical Therapist",
    isUpcoming: true,
    location: "Suite 200, Room 3",
  },
  {
    id: "3",
    scheduledStart: Date.now() - 7 * 24 * 60 * 60 * 1000,
    scheduledEnd: Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
    durationMinutes: 60,
    appointmentType: "initial_evaluation",
    status: "completed",
    clinicianName: "Dr. Martinez",
    clinicianType: "Physical Therapist",
    isUpcoming: false,
    location: "Suite 200, Room 1",
  },
  {
    id: "4",
    scheduledStart: Date.now() - 14 * 24 * 60 * 60 * 1000,
    scheduledEnd: Date.now() - 14 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000,
    durationMinutes: 45,
    appointmentType: "consultation",
    status: "completed",
    clinicianName: "Dr. Thompson",
    clinicianType: "Physical Therapist",
    isUpcoming: false,
    isVirtual: true,
  },
];

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatAppointmentType(type: string): string {
  const labels: Record<string, string> = {
    initial_evaluation: "Initial Evaluation",
    follow_up: "Follow-up Visit",
    re_evaluation: "Re-evaluation",
    discharge: "Discharge Visit",
    consultation: "Consultation",
  };
  return labels[type] || type;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "confirmed":
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case "scheduled":
      return <Clock className="w-4 h-4 text-blue-500" />;
    case "cancelled":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-slate-400" />;
    default:
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    confirmed: "Confirmed",
    checked_in: "Checked In",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

// Appointment Card Component
function AppointmentCard({
  appointment,
  isPast,
}: {
  appointment: Appointment;
  isPast: boolean;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 transition-all",
        isPast
          ? "border-slate-100 opacity-75"
          : "border-slate-200 hover:border-blue-200 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Date Badge */}
        <div
          className={cn(
            "flex-shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center",
            isPast ? "bg-slate-100" : "bg-blue-50"
          )}
        >
          <span
            className={cn(
              "text-xs font-medium uppercase",
              isPast ? "text-slate-500" : "text-blue-600"
            )}
          >
            {new Date(appointment.scheduledStart).toLocaleDateString("en-US", {
              month: "short",
            })}
          </span>
          <span
            className={cn(
              "text-xl font-bold",
              isPast ? "text-slate-600" : "text-blue-700"
            )}
          >
            {new Date(appointment.scheduledStart).getDate()}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-slate-900">
              {formatAppointmentType(appointment.appointmentType)}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                appointment.status === "confirmed"
                  ? "bg-emerald-100 text-emerald-700"
                  : appointment.status === "scheduled"
                    ? "bg-blue-100 text-blue-700"
                    : appointment.status === "completed"
                      ? "bg-slate-100 text-slate-600"
                      : appointment.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
              )}
            >
              {getStatusIcon(appointment.status)}
              {getStatusLabel(appointment.status)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatTime(appointment.scheduledStart)} ({appointment.durationMinutes} min)
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {appointment.clinicianName}
            </span>
            {appointment.isVirtual ? (
              <span className="flex items-center gap-1.5 text-purple-600">
                <Video className="w-4 h-4" />
                Virtual Visit
              </span>
            ) : appointment.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {appointment.location}
              </span>
            ) : null}
          </div>

          {appointment.notes && (
            <p className="mt-2 text-sm text-slate-400 italic">Note: {appointment.notes}</p>
          )}
        </div>

        {/* Actions */}
        {!isPast && appointment.status !== "cancelled" && (
          <div className="flex items-center gap-2">
            {appointment.isVirtual && appointment.status === "confirmed" && (
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Video className="w-4 h-4 mr-1" />
                Join
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowActions(!showActions)}>
              Manage
            </Button>
          </div>
        )}
      </div>

      {/* Action Menu */}
      {showActions && !isPast && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
          <Button variant="outline" size="sm" className="flex-1">
            <Calendar className="w-4 h-4 mr-1" />
            Reschedule
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:bg-red-50">
            <XCircle className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Phone className="w-4 h-4 mr-1" />
            Contact Clinic
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PatientAppointments() {
  const [showHistory, setShowHistory] = useState(false);

  const upcomingAppointments = MOCK_APPOINTMENTS.filter((a) => a.isUpcoming);
  const pastAppointments = MOCK_APPOINTMENTS.filter((a) => !a.isUpcoming);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Appointments</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage your scheduled visits</p>
        </div>
        <Button>
          <CalendarPlus className="w-4 h-4 mr-2" />
          Request Appointment
        </Button>
      </div>

      {/* Upcoming Appointments */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Upcoming Appointments
          <span className="text-sm font-normal text-slate-500">
            ({upcomingAppointments.length})
          </span>
        </h2>

        {upcomingAppointments.length > 0 ? (
          <div className="space-y-4">
            {upcomingAppointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} isPast={false} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">No upcoming appointments</p>
            <Button>
              <CalendarPlus className="w-4 h-4 mr-2" />
              Schedule Your Next Visit
            </Button>
          </div>
        )}
      </div>

      {/* Next Appointment Reminder Card */}
      {upcomingAppointments.length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Your next appointment</p>
              <p className="text-xl font-semibold">
                {formatDate(upcomingAppointments[0].scheduledStart)} at{" "}
                {formatTime(upcomingAppointments[0].scheduledStart)}
              </p>
              <p className="text-blue-100 mt-1">
                {formatAppointmentType(upcomingAppointments[0].appointmentType)} with{" "}
                {upcomingAppointments[0].clinicianName}
              </p>
            </div>
            <div className="text-right">
              {upcomingAppointments[0].isVirtual ? (
                <Button className="bg-white text-blue-600 hover:bg-blue-50">
                  <Video className="w-4 h-4 mr-2" />
                  Join Virtual Visit
                </Button>
              ) : (
                <div className="text-blue-100 text-sm">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {upcomingAppointments[0].location || "Location TBD"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Past Appointments */}
      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-lg font-medium text-slate-900 mb-4 hover:text-slate-600 transition-colors"
        >
          <ChevronRight
            className={cn("w-5 h-5 transition-transform", showHistory && "rotate-90")}
          />
          Past Appointments
          <span className="text-sm font-normal text-slate-500">
            ({pastAppointments.length})
          </span>
        </button>

        {showHistory && (
          <div className="space-y-3">
            {pastAppointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} isPast={true} />
            ))}
          </div>
        )}
      </div>

      {/* Contact Info */}
      <div className="mt-8 bg-slate-50 rounded-xl p-5">
        <h3 className="font-medium text-slate-900 mb-3">Need to make changes?</h3>
        <p className="text-sm text-slate-600 mb-4">
          To reschedule or cancel an appointment, please contact us at least 24 hours in advance.
        </p>
        <div className="flex gap-4">
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4 mr-2" />
            Call (555) 123-4567
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Request Online
          </Button>
        </div>
      </div>
    </div>
  );
}
