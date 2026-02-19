import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  UserCheck,
  UserX,
  UserMinus,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function TeamOverview() {
  const {
    selectedTeamId,
    setSelectedTeamId,
    setCurrentPage,
    setSelectedAthleteId,
  } = useATContext();

  const teams = useQuery(api.teams.list, {});
  const selectedTeam = teams?.find((t) => t._id === selectedTeamId);

  // Get team-specific data
  const athletes = useQuery(
    api.athletes.listByTeam,
    selectedTeamId ? { teamId: selectedTeamId } : "skip"
  );

  const activeInjuries = useQuery(
    api.injuries.listActive,
    selectedTeamId ? { teamId: selectedTeamId } : {}
  );

  const recentEncounters = useQuery(
    api.encounters.listRecent,
    selectedTeamId ? { teamId: selectedTeamId, limit: 10 } : { limit: 10 }
  );

  // Calculate roster health stats
  const rosterStats = {
    total: athletes?.length ?? 0,
    healthy: athletes?.filter((a) => a.activeInjuryCount === 0).length ?? 0,
    injured: athletes?.filter((a) => a.activeInjuryCount > 0).length ?? 0,
  };

  const injuryStats = {
    total: activeInjuries?.length ?? 0,
    out: activeInjuries?.filter((i) => i.rtpStatus === "out").length ?? 0,
    limited: activeInjuries?.filter((i) => i.rtpStatus === "limited").length ?? 0,
    full: activeInjuries?.filter((i) => i.rtpStatus === "full").length ?? 0,
  };

  const handleGoToEMR = (athleteId: Id<"athletes">) => {
    setSelectedAthleteId(athleteId);
    setCurrentPage("emr");
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header with Team Selector */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-slate-900">
              Team Overview
            </h1>
            <p className="mt-1 text-muted-foreground">
              {selectedTeam
                ? `${selectedTeam.sport} • ${selectedTeam.season}`
                : "Select a team to view details"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedTeamId || ""}
                onChange={(e) =>
                  setSelectedTeamId(
                    e.target.value ? (e.target.value as Id<"teams">) : null
                  )
                }
                className="appearance-none rounded-lg border border-slate-200 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
              >
                <option value="">All Teams</option>
                {teams?.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Roster Health Overview */}
        <div className="mb-8">
          <h2 className="font-heading text-lg font-semibold text-slate-900 mb-4">
            Roster Health
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Athletes</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">
                    {rosterStats.total}
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
                  <p className="text-sm font-medium text-muted-foreground">Healthy</p>
                  <p className="mt-1 text-3xl font-semibold text-green-600">
                    {rosterStats.healthy}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${rosterStats.total > 0 ? (rosterStats.healthy / rosterStats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Limited</p>
                  <p className="mt-1 text-3xl font-semibold text-amber-600">
                    {injuryStats.limited}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                  <UserMinus className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Out</p>
                  <p className="mt-1 text-3xl font-semibold text-red-600">
                    {injuryStats.out}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Injury Report */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-500" />
                <h2 className="font-heading font-semibold text-slate-900">
                  Active Injury Report
                </h2>
              </div>
              <span className="text-sm font-medium text-slate-500">
                {injuryStats.total} active
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {!activeInjuries || activeInjuries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
                  <p className="font-medium text-slate-900">All Clear!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No active injuries on the roster
                  </p>
                </div>
              ) : (
                activeInjuries.map((injury) => (
                  <button
                    key={injury._id}
                    onClick={() => handleGoToEMR(injury.athleteId)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                          injury.rtpStatus === "out"
                            ? "bg-red-100 text-red-700"
                            : injury.rtpStatus === "limited"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {injury.athleteName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{injury.athleteName}</p>
                        <p className="text-sm text-muted-foreground">
                          {injury.bodyRegion}
                          {injury.side !== "NA" && ` (${injury.side})`}
                          {injury.diagnosis && ` • ${injury.diagnosis}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            injury.rtpStatus === "out"
                              ? "bg-red-100 text-red-700"
                              : injury.rtpStatus === "limited"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {injury.rtpStatus === "out"
                            ? "Out"
                            : injury.rtpStatus === "limited"
                              ? "Limited"
                              : "Full"}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Day {injury.daysSinceInjury}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Recent Encounters */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-500" />
                <h2 className="font-heading font-semibold text-slate-900">
                  Recent Encounters
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage("emr")}
              >
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {!recentEncounters || recentEncounters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <FileText className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="font-medium text-slate-900">No encounters yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Documented encounters will appear here
                  </p>
                </div>
              ) : (
                recentEncounters.map((encounter) => (
                  <button
                    key={encounter._id}
                    onClick={() => handleGoToEMR(encounter.athleteId)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                        {encounter.athleteName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{encounter.athleteName}</p>
                        <p className="text-xs text-muted-foreground">
                          {encounter.encounterType.replace(/_/g, " ")} • {encounter.providerName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(encounter.encounterDatetime).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Roster Quick View */}
        {athletes && athletes.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <h2 className="font-heading font-semibold text-slate-900">
                  Roster ({athletes.length})
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage("emr")}
              >
                Open EMR <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-px bg-slate-100 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {athletes.slice(0, 12).map((athlete) => (
                <button
                  key={athlete._id}
                  onClick={() => handleGoToEMR(athlete._id)}
                  className="flex items-center gap-3 bg-white px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
                      athlete.activeInjuryCount > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {athlete.jerseyNumber || athlete.firstName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {athlete.firstName} {athlete.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {athlete.position || "No position"}
                    </p>
                  </div>
                  {athlete.activeInjuryCount > 0 && (
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {athletes.length > 12 && (
              <div className="border-t border-slate-200 px-5 py-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage("emr")}
                >
                  View all {athletes.length} athletes
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
