import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronDown,
  AlertCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

export default function RosterColumn() {
  const {
    selectedTeamId,
    setSelectedTeamId,
    selectedAthleteId,
    setSelectedAthleteId,
    setSelectedEncounterId,
    setViewMode,
  } = useATContext();

  const [searchQuery, setSearchQuery] = useState("");

  const teams = useQuery(api.teams.list, {});
  const athletes = useQuery(
    api.athletes.listByTeam,
    selectedTeamId ? { teamId: selectedTeamId } : "skip"
  );

  // Get all athletes if no team selected
  const allAthletes = useQuery(
    api.athletes.listAll,
    !selectedTeamId ? {} : "skip"
  );

  const athleteList = selectedTeamId ? athletes : allAthletes;
  const selectedTeam = teams?.find((t) => t._id === selectedTeamId);

  // Filter athletes by search
  const filteredAthletes = athleteList?.filter((athlete) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${athlete.firstName} ${athlete.lastName}`.toLowerCase();
    return (
      fullName.includes(query) ||
      athlete.jerseyNumber?.toLowerCase().includes(query) ||
      athlete.position?.toLowerCase().includes(query)
    );
  });

  const handleSelectAthlete = (athleteId: Id<"athletes">) => {
    setSelectedAthleteId(athleteId);
    setSelectedEncounterId(null);
    setViewMode("dashboard");
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-slate-200 bg-white">
      {/* Team Selector Header */}
      <div className="border-b border-slate-200 p-3">
        <div className="relative">
          <select
            value={selectedTeamId || "all"}
            onChange={(e) => {
              const value = e.target.value === "all" ? null : (e.target.value as Id<"teams">);
              setSelectedTeamId(value);
              setSelectedAthleteId(null);
              setSelectedEncounterId(null);
            }}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Teams</option>
            {teams?.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        {selectedTeam && (
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedTeam.sport} • {selectedTeam.season}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="border-b border-slate-200 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search athletes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Athlete List */}
      <div className="flex-1 overflow-y-auto">
        {!athleteList ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : filteredAthletes?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <User className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No athletes found" : "No athletes on this team"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAthletes?.map((athlete) => (
              <button
                key={athlete._id}
                onClick={() => handleSelectAthlete(athlete._id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50",
                  selectedAthleteId === athlete._id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium flex-shrink-0",
                  selectedAthleteId === athlete._id
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600"
                )}>
                  {athlete.jerseyNumber || athlete.firstName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "font-medium truncate",
                      selectedAthleteId === athlete._id ? "text-primary" : "text-slate-900"
                    )}>
                      {athlete.firstName} {athlete.lastName}
                    </p>
                    {athlete.activeInjuryCount > 0 && (
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {athlete.position || "No position"}
                    {athlete.classYear && ` • ${athlete.classYear}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-slate-200 px-3 py-2 bg-slate-50">
        <p className="text-xs text-muted-foreground">
          {filteredAthletes?.length ?? 0} athletes
          {selectedTeam ? ` on ${selectedTeam.name}` : " total"}
        </p>
      </div>
    </div>
  );
}
