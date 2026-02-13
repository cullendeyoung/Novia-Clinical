import { Link, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Mic,
} from "lucide-react";
import type { Doc } from "../../../convex/_generated/dataModel";

type DashboardContext = {
  clinician: Doc<"clinicians"> | null | undefined;
};

// Placeholder data - will be replaced with real queries
const stats = [
  {
    name: "Today's Sessions",
    value: "0",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    name: "Pending Reviews",
    value: "0",
    icon: AlertCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    name: "Monthly Notes",
    value: "0",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    name: "Avg. Time Saved",
    value: "0 min",
    icon: Clock,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
];

export default function Dashboard() {
  const { clinician } = useOutletContext<DashboardContext>();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            Welcome back{clinician?.fullName ? `, ${clinician.fullName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's an overview of your clinical documentation
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/new-session">
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 font-heading text-lg font-semibold text-slate-900">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/dashboard/new-session"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Start Recording</p>
              <p className="text-sm text-muted-foreground">
                Begin a new documentation session
              </p>
            </div>
          </Link>

          <Link
            to="/dashboard/patients"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">View Patients</p>
              <p className="text-sm text-muted-foreground">
                Manage your patient records
              </p>
            </div>
          </Link>

          <Link
            to="/dashboard/templates"
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Note Templates</p>
              <p className="text-sm text-muted-foreground">
                Customize your note formats
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-slate-900">
            Recent Sessions
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/sessions">View All</Link>
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-medium text-slate-900">No sessions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start your first recording session to generate clinical notes
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard/new-session">
                <Plus className="mr-2 h-4 w-4" />
                Start First Session
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
