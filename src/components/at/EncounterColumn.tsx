import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  User,
  Clock,
  Activity,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EncounterColumn() {
  const {
    selectedAthleteId,
    selectedEncounterId,
    setSelectedEncounterId,
    setViewMode,
    viewMode,
  } = useATContext();

  const athlete = useQuery(
    api.athletes.getById,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const encounters = useQuery(
    api.encounters.getByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const injuries = useQuery(
    api.injuries.getByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId, status: "active" } : "skip"
  );

  if (!selectedAthleteId) {
    return (
      <div className="flex h-full w-full flex-col border-r border-slate-200 bg-slate-50">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <User className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">Select an Athlete</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose an athlete from the roster to view their history
          </p>
        </div>
      </div>
    );
  }

  const handleViewProfile = () => {
    setSelectedEncounterId(null);
    setViewMode("profile");
  };

  const handleNewEncounter = () => {
    setSelectedEncounterId(null);
    setViewMode("new-encounter");
  };

  const handleSelectEncounter = (encounterId: typeof selectedEncounterId) => {
    setSelectedEncounterId(encounterId);
    setViewMode("encounter");
  };

  const formatEncounterType = (type: string) => {
    const typeMap: Record<string, string> = {
      daily_care: "Daily Care",
      soap_followup: "SOAP Follow-Up",
      initial_eval: "Initial Eval / New Injury",
      rtp_clearance: "RTP Clearance",
      other: "Other",
    };
    return typeMap[type] || type;
  };

  return (
    <div className="flex h-full w-full flex-col border-r border-slate-200 bg-white">
      {/* Athlete Header */}
      <div className="border-b border-slate-200 p-4">
        <button
          onClick={handleViewProfile}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg p-2 -m-2 transition-colors hover:bg-slate-50",
            viewMode === "profile" && "bg-primary/5"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {athlete?.jerseyNumber || athlete?.firstName?.[0] || "?"}
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-slate-900">
              {athlete?.firstName} {athlete?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {athlete?.teamName} • {athlete?.position || "No position"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      {/* Active Injuries Banner */}
      {injuries && injuries.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {injuries.length} Active Injur{injuries.length === 1 ? "y" : "ies"}
            </span>
          </div>
          <div className="mt-1 space-y-1">
            {injuries.slice(0, 2).map((injury) => (
              <p key={injury._id} className="text-xs text-amber-600">
                {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`} - {injury.rtpStatus}
              </p>
            ))}
            {injuries.length > 2 && (
              <p className="text-xs text-amber-500">+{injuries.length - 2} more</p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-b border-slate-200 p-3 flex gap-2">
        <Button
          onClick={handleNewEncounter}
          size="sm"
          className="flex-1"
          variant={viewMode === "new-encounter" ? "default" : "outline"}
        >
          <Plus className="mr-1 h-4 w-4" />
          New Document
        </Button>
        <Button
          onClick={handleViewProfile}
          size="sm"
          variant={viewMode === "profile" ? "secondary" : "ghost"}
        >
          <User className="h-4 w-4" />
        </Button>
      </div>

      {/* Encounters List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Encounter History
          </p>
        </div>

        {!encounters ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : encounters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <FileText className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-muted-foreground">No encounters yet</p>
            <Button
              onClick={handleNewEncounter}
              size="sm"
              className="mt-3"
            >
              <Plus className="mr-1 h-4 w-4" />
              Create First Document
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {encounters.map((encounter) => (
              <button
                key={encounter._id}
                onClick={() => handleSelectEncounter(encounter._id)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50",
                  selectedEncounterId === encounter._id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0",
                  encounter.encounterType === "initial_eval"
                    ? "bg-blue-100 text-blue-600"
                    : encounter.encounterType === "rtp_clearance"
                      ? "bg-green-100 text-green-600"
                      : encounter.encounterType === "daily_care"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-slate-100 text-slate-600"
                )}>
                  {encounter.encounterType === "rtp_clearance" ? (
                    <Activity className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      selectedEncounterId === encounter._id ? "text-primary" : "text-slate-900"
                    )}>
                      {formatEncounterType(encounter.encounterType)}
                    </p>
                    {encounter.aiGenerated && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(encounter.encounterDatetime).toLocaleDateString()}
                    </p>
                    {encounter.isSignedOff && (
                      <span className="text-[10px] text-green-600 font-medium">Signed</span>
                    )}
                  </div>
                  {encounter.injuryBodyRegion && (
                    <div className="mt-1">
                      <span className={`text-xs truncate ${
                        encounter.encounterType === "initial_eval"
                          ? "text-amber-800 font-semibold bg-amber-200 px-2 py-0.5 rounded"
                          : "text-muted-foreground"
                      }`}>
                        {encounter.encounterType === "initial_eval" ? "🔶 " : "Re: "}{encounter.injuryBodyRegion}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 px-3 py-2 bg-slate-50">
        <p className="text-xs text-muted-foreground">
          {encounters?.length ?? 0} encounters
        </p>
      </div>
    </div>
  );
}
