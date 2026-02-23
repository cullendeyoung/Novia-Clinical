import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  Users,
  Activity,
  FileText,
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

  // Create a map of athlete ID to their status
  // Priority: manual availabilityStatus > injury-derived status
  const athleteStatusMap = new Map<Id<"athletes">, "healthy" | "limited" | "out">();

  // First, set status based on manual availabilityStatus from athlete records
  athletes?.forEach((athlete) => {
    if (athlete.availabilityStatus) {
      athleteStatusMap.set(athlete._id, athlete.availabilityStatus);
    }
  });

  // For athletes without a manual status, derive from their worst injury RTP status
  activeInjuries?.forEach((injury) => {
    // Skip if athlete already has a manual status set
    if (athleteStatusMap.has(injury.athleteId)) return;

    const currentStatus = athleteStatusMap.get(injury.athleteId);
    // Map injury rtpStatus to our status values
    const injuryStatus = injury.rtpStatus === "out" ? "out" : injury.rtpStatus === "limited" ? "limited" : "healthy";

    // Priority: out > limited > healthy
    if (!currentStatus) {
      athleteStatusMap.set(injury.athleteId, injuryStatus);
    } else if (injuryStatus === "out") {
      athleteStatusMap.set(injury.athleteId, "out");
    } else if (injuryStatus === "limited" && currentStatus !== "out") {
      athleteStatusMap.set(injury.athleteId, "limited");
    }
  });

  // Calculate roster health stats based on the combined status (manual + injury-derived)
  const rosterStats = {
    total: athletes?.length ?? 0,
    healthy: athletes?.filter((a) => {
      const status = athleteStatusMap.get(a._id);
      return !status || status === "healthy";
    }).length ?? 0,
    injured: athletes?.filter((a) => {
      const status = athleteStatusMap.get(a._id);
      return status === "limited" || status === "out";
    }).length ?? 0,
  };

  // Calculate status-based stats (counting athletes by their final status)
  const statusStats = {
    healthy: athletes?.filter((a) => {
      const status = athleteStatusMap.get(a._id);
      return !status || status === "healthy";
    }).length ?? 0,
    limited: athletes?.filter((a) => athleteStatusMap.get(a._id) === "limited").length ?? 0,
    out: athletes?.filter((a) => athleteStatusMap.get(a._id) === "out").length ?? 0,
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

  const getStatusColor = (athleteId: Id<"athletes">) => {
    const status = athleteStatusMap.get(athleteId);
    if (status === "out") return "bg-red-500";
    if (status === "limited") return "bg-yellow-500";
    return "bg-green-500"; // healthy or undefined defaults to green
  };

  const getStatusLabel = (athleteId: Id<"athletes">) => {
    const status = athleteStatusMap.get(athleteId);
    if (status === "out") return "Out";
    if (status === "limited") return "Limited";
    return "Healthy"; // healthy or undefined defaults to Healthy
  };

  // Get display class for status badge
  const getStatusBadgeClass = (athleteId: Id<"athletes">) => {
    const status = athleteStatusMap.get(athleteId);
    if (status === "out") return "bg-red-100 text-red-700";
    if (status === "limited") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
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
        <div className="mb-6">
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
                    {statusStats.limited}
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
                    {statusStats.out}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid - Roster on left, Encounters + Injuries on right */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Full Roster with Status */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <h2 className="font-heading font-semibold text-slate-900">
                  Roster
                </h2>
              </div>
              <span className="text-sm font-medium text-slate-500">
                {rosterStats.total} athletes
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {!athletes || athletes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Users className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="font-medium text-slate-900">No athletes</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTeamId ? "No athletes on this team" : "Select a team to view roster"}
                  </p>
                </div>
              ) : (
                athletes.map((athlete) => (
                  <button
                    key={athlete._id}
                    onClick={() => handleGoToEMR(athlete._id)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status indicator dot */}
                      <div
                        className={`h-3 w-3 rounded-full flex-shrink-0 ${getStatusColor(athlete._id)}`}
                        title={getStatusLabel(athlete._id)}
                      />
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                        {athlete.jerseyNumber || athlete.firstName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {athlete.firstName} {athlete.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {athlete.position || "No position"}
                          {athlete.classYear && ` • ${athlete.classYear}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadgeClass(athlete._id)}`}
                      >
                        {getStatusLabel(athlete._id)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column - Encounters stacked above Injuries */}
          <div className="space-y-6">
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
              <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
                {!recentEncounters || recentEncounters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <FileText className="h-10 w-10 text-slate-300 mb-2" />
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

            {/* Active Injury Report */}
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
              <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
                {!activeInjuries || activeInjuries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <CheckCircle className="h-10 w-10 text-green-400 mb-2" />
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
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ${
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
                          <p className="text-xs text-muted-foreground">
                            {injury.bodyRegion}
                            {injury.side !== "NA" && ` (${injury.side})`}
                            {injury.diagnosis && ` • ${injury.diagnosis}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
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
                          <p className="text-xs text-muted-foreground mt-0.5">
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
          </div>
        </div>
      </div>
    </div>
  );
}
