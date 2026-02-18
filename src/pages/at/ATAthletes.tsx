import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  AlertCircle,
  Clock,
  Plus,
  Filter,
  ChevronDown,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function ATAthletes() {
  const { selectedTeamId, setSelectedTeamId } = useATContext();
  const [searchParams] = useSearchParams();
  const urlTeamId = searchParams.get("team") as Id<"teams"> | null;

  // Use URL team param if present, otherwise use context
  const effectiveTeamId = urlTeamId || selectedTeamId;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "injured" | "healthy">("all");
  const [showFilters, setShowFilters] = useState(false);

  const teams = useQuery(api.teams.list, {});
  const athletes = useQuery(
    api.athletes.listByTeam,
    effectiveTeamId ? { teamId: effectiveTeamId } : "skip"
  );

  // Get all athletes across all teams if no team selected
  const allTeamAthletes = useQuery(
    api.athletes.listAll,
    !effectiveTeamId ? {} : "skip"
  );

  const athleteList = effectiveTeamId ? athletes : allTeamAthletes;
  const selectedTeam = teams?.find((t) => t._id === effectiveTeamId);

  // Filter athletes
  const filteredAthletes = useMemo(() => {
    if (!athleteList) return [];

    return athleteList.filter((athlete) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
        const matchesSearch =
          fullName.includes(query) ||
          athlete.jerseyNumber?.toLowerCase().includes(query) ||
          athlete.position?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter === "injured" && athlete.activeInjuryCount === 0) return false;
      if (statusFilter === "healthy" && athlete.activeInjuryCount > 0) return false;

      return true;
    });
  }, [athleteList, searchQuery, statusFilter]);

  // Group by team if viewing all (only when using listAll which includes teamId)
  const athletesByTeam = useMemo(() => {
    if (effectiveTeamId || !filteredAthletes || !allTeamAthletes) return null;

    const grouped: Record<string, typeof allTeamAthletes> = {};
    // Cast to allTeamAthletes type since we know we're in the "all" view
    (filteredAthletes as typeof allTeamAthletes).forEach((athlete) => {
      const tid = athlete.teamId?.toString() || "unknown";
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(athlete);
    });
    return grouped;
  }, [effectiveTeamId, filteredAthletes, allTeamAthletes]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900">
            {selectedTeam ? `${selectedTeam.name} Roster` : "All Athletes"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {filteredAthletes?.length ?? 0} athletes
            {searchQuery && " matching search"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/at/encounters/new">
              <Plus className="mr-1 h-4 w-4" />
              New Encounter
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/at/injuries/new">
              <Plus className="mr-1 h-4 w-4" />
              Log Injury
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search athletes by name, jersey, position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 h-4 w-4" />
            Filters
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            {/* Team Filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Team</label>
              <select
                value={effectiveTeamId || "all"}
                onChange={(e) => {
                  const value = e.target.value === "all" ? null : (e.target.value as Id<"teams">);
                  setSelectedTeamId(value);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="all">All Teams</option>
                {teams?.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
              >
                <option value="all">All Status</option>
                <option value="injured">Injured</option>
                <option value="healthy">Healthy</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Athletes List */}
      {!athleteList ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-muted-foreground">Loading athletes...</p>
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-medium text-slate-900">
            {searchQuery ? "No athletes found" : "No athletes yet"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "Select a team or add athletes to get started"}
          </p>
        </div>
      ) : effectiveTeamId ? (
        // Single team view
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Athlete
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Last Encounter
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAthletes.map((athlete) => (
                <tr key={athlete._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <Link
                      to={`/at/athletes/${athlete._id}`}
                      className="flex items-center gap-3 hover:text-primary"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {athlete.jerseyNumber || athlete.firstName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {athlete.firstName} {athlete.lastName}
                        </p>
                        {athlete.jerseyNumber && (
                          <p className="text-sm text-muted-foreground">
                            #{athlete.jerseyNumber}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {athlete.position || "-"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {athlete.classYear || "-"}
                  </td>
                  <td className="px-5 py-4">
                    {athlete.activeInjuryCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <AlertCircle className="h-3 w-3" />
                        {athlete.activeInjuryCount} injury{athlete.activeInjuryCount !== 1 ? "ies" : "y"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {athlete.lastEncounterDate ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(athlete.lastEncounterDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/at/athletes/${athlete._id}`}>Profile</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/at/encounters/new?athlete=${athlete._id}`}>
                          <Plus className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // All teams view - grouped
        <div className="space-y-6">
          {athletesByTeam &&
            Object.entries(athletesByTeam).map(([teamId, teamAthletes]) => {
              const team = teams?.find((t) => t._id === teamId);
              return (
                <div key={teamId} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm font-medium text-blue-700">
                          {team?.name?.[0] || "?"}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{team?.name || "Unknown Team"}</h3>
                          <p className="text-xs text-muted-foreground">
                            {team?.sport} • {teamAthletes.length} athletes
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTeamId(teamId as Id<"teams">)}
                      >
                        View Team
                      </Button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {teamAthletes.slice(0, 5).map((athlete) => (
                      <Link
                        key={athlete._id}
                        to={`/at/athletes/${athlete._id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {athlete.jerseyNumber || athlete.firstName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {athlete.firstName} {athlete.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {athlete.position || "No position"} • {athlete.classYear || ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {athlete.activeInjuryCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <AlertCircle className="h-3 w-3" />
                              {athlete.activeInjuryCount}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                    {teamAthletes.length > 5 && (
                      <div className="px-5 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTeamId(teamId as Id<"teams">)}
                        >
                          View all {teamAthletes.length} athletes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
