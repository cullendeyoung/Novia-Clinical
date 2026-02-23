import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  Plus,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

type EncounterTypeFilter = "all" | "initial_eval" | "daily_care" | "soap_followup" | "rtp_clearance" | "rehab_program" | "other";

interface MyEncountersProps {
  onBack: () => void;
}

export default function MyEncounters({ onBack }: MyEncountersProps) {
  const {
    setCurrentPage,
    setSelectedAthleteId,
    setSelectedEncounterId,
    setViewMode,
  } = useATContext();

  const [typeFilter, setTypeFilter] = useState<EncounterTypeFilter>("all");

  const currentUser = useQuery(api.users.getCurrent);
  const myEncounters = useQuery(api.encounters.listMyEncounters, { limit: 100 });

  // Filter encounters by type
  const filteredEncounters = (myEncounters || []).filter((enc) => {
    if (typeFilter === "all") return true;
    return enc.encounterType === typeFilter;
  });

  // Group encounters by date for better organization
  const groupedEncounters: Record<string, typeof filteredEncounters> = {};
  filteredEncounters.forEach((enc) => {
    const date = new Date(enc.encounterDatetime);
    const dateKey = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedEncounters[dateKey]) {
      groupedEncounters[dateKey] = [];
    }
    groupedEncounters[dateKey].push(enc);
  });

  // Sort dates in reverse chronological order
  const sortedDates = Object.keys(groupedEncounters).sort((a, b) => {
    const dateA = new Date(groupedEncounters[a][0].encounterDatetime);
    const dateB = new Date(groupedEncounters[b][0].encounterDatetime);
    return dateB.getTime() - dateA.getTime();
  });

  const handleViewEncounter = (athleteId: Id<"athletes">, encounterId: Id<"encounters">) => {
    setSelectedAthleteId(athleteId);
    setSelectedEncounterId(encounterId);
    setViewMode("encounter");
    setCurrentPage("emr");
  };

  const handleNewDocument = () => {
    setSelectedAthleteId(null);
    setViewMode("start-document");
    setCurrentPage("emr");
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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-600"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              My Encounters
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentUser?.fullName} • {filteredEncounters.length} encounter{filteredEncounters.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={handleNewDocument}>
            <Plus className="h-4 w-4 mr-1" />
            New Document
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="h-4 w-4" />
            <span>Filter by type:</span>
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as EncounterTypeFilter)}
              className="appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="initial_eval">Initial Evaluation</option>
              <option value="daily_care">Daily Care</option>
              <option value="soap_followup">SOAP Follow-Up</option>
              <option value="rtp_clearance">RTP Clearance</option>
              <option value="rehab_program">Rehab Program</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!myEncounters ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="h-8 w-8 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your encounters...</p>
          </div>
        ) : filteredEncounters.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No Encounters Found</h3>
            <p className="text-muted-foreground mt-1">
              {typeFilter !== "all"
                ? "Try adjusting your filter."
                : "You haven't documented any encounters yet."}
            </p>
            <Button onClick={handleNewDocument} className="mt-4">
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Encounter
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-3 bg-slate-50">
                  <h2 className="font-semibold text-slate-900">{date}</h2>
                  <p className="text-xs text-muted-foreground">
                    {groupedEncounters[date].length} encounter{groupedEncounters[date].length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {groupedEncounters[date].map((encounter) => (
                    <button
                      key={encounter._id}
                      onClick={() => handleViewEncounter(encounter.athleteId, encounter._id)}
                      className="w-full p-4 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${getEncounterTypeColor(encounter.encounterType)}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {encounter.athleteName}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">
                              {formatEncounterType(encounter.encounterType)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                              <span>{encounter.teamName}</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(encounter.encounterDatetime).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 mt-2" />
                      </div>
                    </button>
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
