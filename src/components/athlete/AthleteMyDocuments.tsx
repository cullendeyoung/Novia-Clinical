import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FileText, ChevronDown, ChevronRight, Calendar, User } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function AthleteMyDocuments() {
  const encounters = useQuery(api.athletePortal.getMyEncounters, {});
  const [expandedEncounterId, setExpandedEncounterId] = useState<Id<"encounters"> | null>(null);

  // Fetch encounter details when expanded
  const encounterDetail = useQuery(
    api.athletePortal.getMyEncounterById,
    expandedEncounterId ? { encounterId: expandedEncounterId } : "skip"
  );

  if (encounters === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    );
  }

  const formatEncounterType = (type: string) => {
    const typeMap: Record<string, string> = {
      daily_care: "Daily Care / Treatment",
      soap_followup: "SOAP Follow-Up",
      initial_eval: "Initial Evaluation",
      rtp_clearance: "Return-to-Play Clearance",
      rehab_program: "Rehab Program",
      other: "Other",
    };
    return typeMap[type] || type;
  };

  const getEncounterIcon = (type: string) => {
    switch (type) {
      case "initial_eval":
        return "bg-blue-100 text-blue-600";
      case "rtp_clearance":
        return "bg-green-100 text-green-600";
      case "daily_care":
        return "bg-purple-100 text-purple-600";
      case "soap_followup":
        return "bg-amber-100 text-amber-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const toggleEncounter = (encounterId: Id<"encounters">) => {
    setExpandedEncounterId(expandedEncounterId === encounterId ? null : encounterId);
  };

  // Group encounters by month
  const groupedEncounters: Record<string, typeof encounters> = {};
  encounters.forEach((enc) => {
    const date = new Date(enc.encounterDatetime);
    const monthLabel = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!groupedEncounters[monthLabel]) {
      groupedEncounters[monthLabel] = [];
    }
    groupedEncounters[monthLabel].push(enc);
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Documents</h1>
        <p className="text-muted-foreground mt-1">
          View your medical encounters and notes
        </p>
      </div>

      {encounters.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Documents Yet</h3>
          <p className="text-muted-foreground mt-1">
            You don't have any medical documents recorded yet.
          </p>
        </div>
      ) : (
        Object.entries(groupedEncounters).map(([month, monthEncounters]) => (
          <div key={month} className="bg-white rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" />
                {month}
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {monthEncounters.length}
                </span>
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {monthEncounters.map((enc) => {
                const isExpanded = expandedEncounterId === enc._id;

                return (
                  <div key={enc._id}>
                    <button
                      onClick={() => toggleEncounter(enc._id)}
                      className="w-full p-5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${getEncounterIcon(
                              enc.encounterType
                            )}`}
                          >
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {formatEncounterType(enc.encounterType)}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              {enc.injuryBodyRegion && (
                                <>
                                  <span>{enc.injuryBodyRegion}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {enc.providerName}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(enc.encounterDatetime).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Document Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5">
                        <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                          {!encounterDetail ? (
                            <p className="text-sm text-muted-foreground">Loading details...</p>
                          ) : (
                            <>
                              {encounterDetail.subjectiveText && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Subjective
                                  </p>
                                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                    {encounterDetail.subjectiveText}
                                  </p>
                                </div>
                              )}

                              {encounterDetail.objectiveText && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Objective
                                  </p>
                                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                    {encounterDetail.objectiveText}
                                  </p>
                                </div>
                              )}

                              {encounterDetail.assessmentText && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Assessment
                                  </p>
                                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                    {encounterDetail.assessmentText}
                                  </p>
                                </div>
                              )}

                              {encounterDetail.planText && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Plan
                                  </p>
                                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                    {encounterDetail.planText}
                                  </p>
                                </div>
                              )}

                              {!encounterDetail.subjectiveText &&
                                !encounterDetail.objectiveText &&
                                !encounterDetail.assessmentText &&
                                !encounterDetail.planText && (
                                  <p className="text-sm text-muted-foreground italic">
                                    No detailed notes recorded for this encounter.
                                  </p>
                                )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
