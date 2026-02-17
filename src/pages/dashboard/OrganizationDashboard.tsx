import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  UsersRound,
  Activity,
  FileText,
  Plus,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function OrganizationDashboard() {
  const stats = useQuery(api.organizations.getStats);
  const organization = useQuery(api.organizations.getCurrent);

  // Check if onboarding is needed (no teams created yet)
  const needsOnboarding = stats?.teamCount === 0;

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Welcome to {organization?.name || "your organization"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {needsOnboarding
            ? "Let's get your organization set up."
            : "Manage your teams, athletic trainers, and athletes from here."}
        </p>
      </div>

      {/* Onboarding Section - Show when no teams exist */}
      {needsOnboarding && (
        <div className="mb-8 rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-lg font-semibold text-slate-900">
                Get Started with Novia
              </h2>
              <p className="mt-1 text-sm text-muted-foreground mb-4">
                Complete these steps to set up your organization and start managing your athletes.
              </p>

              {/* Onboarding Steps */}
              <div className="space-y-3">
                {/* Step 1: Create First Team */}
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Create your first team</p>
                    <p className="text-sm text-muted-foreground">
                      Add a team like "Men's Basketball" or "Women's Soccer"
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/org/teams/new">
                      <Plus className="mr-1 h-4 w-4" />
                      Create Team
                    </Link>
                  </Button>
                </div>

                {/* Step 2: Invite Athletic Trainers */}
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 opacity-60">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Invite athletic trainers</p>
                    <p className="text-sm text-muted-foreground">
                      Add your ATs so they can manage athletes and injuries
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <Plus className="mr-1 h-4 w-4" />
                    Invite Staff
                  </Button>
                </div>

                {/* Step 3: Add Athletes */}
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 opacity-60">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-sm font-medium">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Add athletes to your team</p>
                    <p className="text-sm text-muted-foreground">
                      Import your roster or add athletes manually
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Athletes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Quick Actions - Show when not in onboarding */}
      {!needsOnboarding && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              to="/org/teams"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <UsersRound className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">Manage Teams</p>
                <p className="text-sm text-muted-foreground">Add or edit teams</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/org/staff"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Users className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">Manage Staff</p>
                <p className="text-sm text-muted-foreground">Invite athletic trainers</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/org/settings"
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Activity className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">Organization Settings</p>
                <p className="text-sm text-muted-foreground">Billing and preferences</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      )}

      {/* Subscription Info */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Subscription Status</p>
            <p className="text-sm text-muted-foreground">
              {organization?.teamCount} team{organization?.teamCount !== 1 ? "s" : ""} •{" "}
              {organization?.maxAthleticTrainersPerTeam} AT{organization?.maxAthleticTrainersPerTeam !== 1 ? "s" : ""} per team
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              <CheckCircle className="mr-1 h-3 w-3" />
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
