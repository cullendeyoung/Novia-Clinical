import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  FileText,
  AlertCircle,
  Clock,
  Plus,
  ArrowRight,
  Mic,
  Calendar,
} from "lucide-react";

export default function ATDashboard() {
  const { selectedTeamId } = useATContext();
  const stats = useQuery(api.organizations.getStats);
  const teams = useQuery(api.teams.list, {});

  // Get athletes based on selected team
  const allAthletes = useQuery(
    api.athletes.listByTeam,
    selectedTeamId ? { teamId: selectedTeamId } : "skip"
  );

  // Get recent encounters
  const recentEncounters = useQuery(api.encounters.listRecent, { limit: 5 });

  // Get active injuries
  const activeInjuries = useQuery(api.injuries.listActive, { limit: 10 });

  const selectedTeam = teams?.find((t) => t._id === selectedTeamId);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          {selectedTeamId ? `${selectedTeam?.name || "Team"} Dashboard` : "Athletic Training Dashboard"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {selectedTeamId
            ? `Manage athletes and documentation for ${selectedTeam?.sport || "this team"}`
            : "Overview of all teams and athletes in your organization"}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Link
          to="/at/ambient"
          className="group flex items-center gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50 p-4 transition-all hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Ambient Notes</p>
            <p className="text-sm text-muted-foreground">Voice-to-SOAP</p>
          </div>
        </Link>

        <Link
          to="/at/encounters/new"
          className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-slate-900">New Encounter</p>
            <p className="text-sm text-muted-foreground">SOAP note</p>
          </div>
        </Link>

        <Link
          to="/at/injuries/new"
          className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Log Injury</p>
            <p className="text-sm text-muted-foreground">New injury record</p>
          </div>
        </Link>

        <Link
          to="/at/daily-status"
          className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Daily Status</p>
            <p className="text-sm text-muted-foreground">Participation</p>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Athletes</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {selectedTeamId ? (allAthletes?.length ?? "-") : (stats?.athleteCount ?? "-")}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Injuries</p>
              <p className="mt-1 text-3xl font-semibold text-amber-600">
                {activeInjuries?.length ?? "-"}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Encounters</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {recentEncounters?.filter(
                  (e) => new Date(e.encounterDatetime).toDateString() === new Date().toDateString()
                ).length ?? 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <FileText className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Teams</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {stats?.teamCount ?? "-"}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Injuries */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              <h2 className="font-heading font-semibold text-slate-900">Active Injuries</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/at/injuries">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {!activeInjuries || activeInjuries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-muted-foreground">No active injuries</p>
              </div>
            ) : (
              activeInjuries.slice(0, 5).map((injury) => (
                <Link
                  key={injury._id}
                  to={`/at/injuries/${injury._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                      {injury.athleteName?.[0] || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{injury.athleteName}</p>
                      <p className="text-sm text-muted-foreground">
                        {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        injury.rtpStatus === "full"
                          ? "bg-green-100 text-green-700"
                          : injury.rtpStatus === "limited"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {injury.rtpStatus === "full" ? "Full" : injury.rtpStatus === "limited" ? "Limited" : "Out"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Encounters */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              <h2 className="font-heading font-semibold text-slate-900">Recent Encounters</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/at/encounters">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {!recentEncounters || recentEncounters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-muted-foreground">No recent encounters</p>
                <Button asChild className="mt-3" size="sm">
                  <Link to="/at/encounters/new">
                    <Plus className="mr-1 h-4 w-4" />
                    Create First Encounter
                  </Link>
                </Button>
              </div>
            ) : (
              recentEncounters.map((encounter) => (
                <Link
                  key={encounter._id}
                  to={`/at/encounters/${encounter._id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                      {encounter.athleteName?.[0] || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{encounter.athleteName}</p>
                      <p className="text-sm text-muted-foreground">
                        {encounter.encounterType?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(encounter.encounterDatetime).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Athletes by Team (when viewing all) */}
      {!selectedTeamId && teams && teams.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <h2 className="font-heading font-semibold text-slate-900">Teams Overview</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {teams.map((team) => (
              <Link
                key={team._id}
                to={`/at/athletes?team=${team._id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-sm font-medium text-blue-700">
                    {team.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.sport} • {team.season}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
