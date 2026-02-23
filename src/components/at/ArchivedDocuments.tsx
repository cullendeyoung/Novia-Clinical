import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  Archive,
  ArrowLeft,
  FileText,
  Clock,
  RotateCcw,
  Filter,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ArchivedDocuments() {
  const { selectedAthleteId, setViewMode, setSelectedEncounterId } = useATContext();
  const [selectedInjuryFilter, setSelectedInjuryFilter] = useState<Id<"injuries"> | "all">("all");
  const [isUnarchiving, setIsUnarchiving] = useState<string | null>(null);

  const athlete = useQuery(
    api.athletes.getById,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const injuries = useQuery(
    api.injuries.getByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const archivedEncounters = useQuery(
    api.encounters.getArchivedByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const unarchiveEncounter = useMutation(api.encounters.unarchive);

  if (!athlete || !archivedEncounters) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-muted-foreground">Loading archived documents...</p>
      </div>
    );
  }

  // Filter archived encounters by selected injury
  const filteredEncounters = selectedInjuryFilter === "all"
    ? archivedEncounters
    : archivedEncounters.filter((enc) => enc.injuryId === selectedInjuryFilter);

  // Group encounters by month for chronological display
  const groupedEncounters: Record<string, typeof archivedEncounters> = {};
  filteredEncounters.forEach((enc) => {
    const date = new Date(enc.encounterDatetime);
    const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!groupedEncounters[monthKey]) {
      groupedEncounters[monthKey] = [];
    }
    groupedEncounters[monthKey].push(enc);
  });

  // Sort months in reverse chronological order
  const sortedMonths = Object.keys(groupedEncounters).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });

  const handleUnarchive = async (encounterId: Id<"encounters">) => {
    setIsUnarchiving(encounterId);
    try {
      await unarchiveEncounter({ encounterId });
      toast.success("Document restored from archive");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to restore document";
      toast.error(message);
    } finally {
      setIsUnarchiving(null);
    }
  };

  const formatEncounterType = (type: string) => {
    const typeMap: Record<string, string> = {
      daily_care: "Daily Care",
      soap_followup: "SOAP Follow-Up",
      initial_eval: "Initial Evaluation",
      rtp_clearance: "RTP Clearance",
      rehab_program: "Rehab Program",
      other: "Other",
    };
    return typeMap[type] || type.replace(/_/g, " ");
  };

  const getEncounterTypeColor = (type: string) => {
    switch (type) {
      case "initial_eval":
        return "bg-blue-100 text-blue-700";
      case "rtp_clearance":
        return "bg-green-100 text-green-700";
      case "daily_care":
        return "bg-purple-100 text-purple-700";
      case "soap_followup":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Get injury name for display
  const getInjuryLabel = (injuryId: Id<"injuries"> | undefined) => {
    if (!injuryId || !injuries) return null;
    const injury = injuries.find((i) => i._id === injuryId);
    if (!injury) return null;
    return `${injury.bodyRegion}${injury.side !== "NA" ? ` (${injury.side})` : ""}`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("profile")}
            className="text-slate-600"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              Archived Documents
            </h1>
            <p className="text-sm text-muted-foreground">
              {athlete.firstName} {athlete.lastName} - {filteredEncounters.length} archived document{filteredEncounters.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            <span>Filter by injury:</span>
          </div>
          <div className="relative">
            <select
              value={selectedInjuryFilter}
              onChange={(e) => setSelectedInjuryFilter(e.target.value as Id<"injuries"> | "all")}
              className="appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Injuries</option>
              {injuries?.map((injury) => (
                <option key={injury._id} value={injury._id}>
                  {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                  {injury.status === "resolved" && " - Resolved"}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {filteredEncounters.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Archive className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No Archived Documents</h3>
            <p className="text-muted-foreground mt-1">
              {selectedInjuryFilter === "all"
                ? "There are no archived documents for this athlete."
                : "There are no archived documents for this injury."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setViewMode("profile")}
            >
              Back to Profile
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedMonths.map((month) => (
              <div key={month} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-3 bg-slate-50">
                  <h2 className="font-semibold text-slate-900">{month}</h2>
                  <p className="text-xs text-muted-foreground">
                    {groupedEncounters[month].length} document{groupedEncounters[month].length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {groupedEncounters[month].map((encounter) => (
                    <div
                      key={encounter._id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${getEncounterTypeColor(encounter.encounterType)}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {formatEncounterType(encounter.encounterType)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(encounter.encounterDatetime).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {encounter.providerName}
                              </span>
                              {encounter.injuryId && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                    {getInjuryLabel(encounter.injuryId as Id<"injuries">)}
                                  </span>
                                </>
                              )}
                            </div>
                            {encounter.archivedAt && (
                              <p className="text-xs text-amber-600 mt-1.5">
                                Archived {new Date(encounter.archivedAt).toLocaleDateString()}
                                {encounter.archivedByName && ` by ${encounter.archivedByName}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnarchive(encounter._id)}
                            disabled={isUnarchiving === encounter._id}
                            className="text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            {isUnarchiving === encounter._id ? (
                              <span className="flex items-center gap-1">
                                <span className="h-3 w-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                Restoring...
                              </span>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Restore
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEncounterId(encounter._id);
                              setViewMode("encounter");
                            }}
                            className="text-slate-600 hover:bg-slate-100"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
