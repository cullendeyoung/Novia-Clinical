import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Users, UsersRound, Activity, FileText } from "lucide-react";

export default function OrganizationDashboard() {
  const stats = useQuery(api.organizations.getStats);
  const organization = useQuery(api.organizations.getCurrent);

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Welcome to {organization?.name || "your organization"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your teams, athletic trainers, and athletes from here.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <UsersRound className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.teamCount ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Teams</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.athleteCount ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Athletes</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.athleticTrainerCount ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Athletic Trainers</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
              <FileText className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.todayEncounterCount ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Today's Encounters</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/org/teams"
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <UsersRound className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-slate-900">Manage Teams</p>
              <p className="text-sm text-muted-foreground">Add or edit teams</p>
            </div>
          </a>
          <a
            href="/org/staff"
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-slate-900">Manage Staff</p>
              <p className="text-sm text-muted-foreground">Invite athletic trainers</p>
            </div>
          </a>
          <a
            href="/org/settings"
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-slate-900">Organization Settings</p>
              <p className="text-sm text-muted-foreground">Billing and preferences</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
