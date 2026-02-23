import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowLeft,
  Calendar,
  User,
  ChevronRight,
  Edit,
  Save,
  X,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Dumbbell,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

export default function InjuryDetail() {
  const {
    selectedInjuryId,
    setSelectedInjuryId,
    setViewMode,
    setSelectedEncounterId,
  } = useATContext();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Editable fields
  const [editMechanism, setEditMechanism] = useState("");
  const [editDiagnosis, setEditDiagnosis] = useState("");

  // Fetch injury details
  const injury = useQuery(
    api.injuries.getById,
    selectedInjuryId ? { injuryId: selectedInjuryId } : "skip"
  );

  // Fetch encounters linked to this injury
  const injuryEncounters = useQuery(
    api.encounters.getByInjury,
    selectedInjuryId ? { injuryId: selectedInjuryId } : "skip"
  );

  // Fetch rehab programs linked to this injury
  const rehabPrograms = useQuery(
    api.rehabPrograms.getByInjury,
    selectedInjuryId ? { injuryId: selectedInjuryId } : "skip"
  );

  const updateInjury = useMutation(api.injuries.update);
  const resolveInjury = useMutation(api.injuries.resolve);
  const reopenInjury = useMutation(api.injuries.reopen);

  const handleStartEditing = () => {
    if (injury) {
      setEditMechanism(injury.mechanism || "");
      setEditDiagnosis(injury.diagnosis || "");
      setIsEditing(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedInjuryId) return;

    setIsSaving(true);
    try {
      await updateInjury({
        injuryId: selectedInjuryId,
        mechanism: editMechanism || undefined,
        diagnosis: editDiagnosis || undefined,
      });
      toast.success("Injury updated successfully");
      setIsEditing(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update injury";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (
    newStatus: "out" | "limited" | "full"
  ) => {
    if (!selectedInjuryId || injury?.rtpStatus === newStatus) return;

    setIsUpdatingStatus(true);
    try {
      await updateInjury({
        injuryId: selectedInjuryId,
        rtpStatus: newStatus,
      });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleClearInjury = async () => {
    if (!selectedInjuryId) return;

    setIsUpdatingStatus(true);
    try {
      await resolveInjury({ injuryId: selectedInjuryId });
      toast.success("Injury cleared and resolved");
      handleBackToProfile();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to clear injury";
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReopenInjury = async () => {
    if (!selectedInjuryId) return;

    setIsUpdatingStatus(true);
    try {
      // Reopen with "out" status by default - user can change after
      await reopenInjury({ injuryId: selectedInjuryId, rtpStatus: "out" });
      toast.success("Injury reopened");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reopen injury";
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleBackToProfile = () => {
    setSelectedInjuryId(null);
    setViewMode("profile");
  };

  const handleViewEncounter = (encounterId: Id<"encounters">) => {
    setSelectedEncounterId(encounterId);
    setViewMode("encounter");
  };

  if (!injury) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-muted-foreground">Loading injury details...</p>
      </div>
    );
  }

  const formatEncounterType = (type: string) => {
    const typeMap: Record<string, string> = {
      daily_care: "Daily Care",
      soap_followup: "Follow-Up",
      initial_eval: "Initial Eval",
      rtp_clearance: "RTP Clearance",
      rehab_program: "Rehab Program",
      other: "Other",
    };
    return typeMap[type] || type;
  };

  const formatBodyRegion = (region: string) => {
    return region
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const isResolved = injury.status === "resolved";

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToProfile}
            className="text-muted-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Profile
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isResolved
                    ? "bg-green-100 text-green-600"
                    : injury.rtpStatus === "out"
                      ? "bg-red-100 text-red-600"
                      : injury.rtpStatus === "limited"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-green-100 text-green-600"
                }`}
              >
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {formatBodyRegion(injury.bodyRegion)}
                  {injury.side !== "NA" && ` (${injury.side})`}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {injury.athleteName} • {injury.teamName}
                </p>
              </div>
            </div>
          </div>

          {!isEditing && (
            <Button variant="outline" size="sm" onClick={handleStartEditing}>
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>

        {/* Status Badge */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              isResolved
                ? "bg-green-100 text-green-800"
                : injury.rtpStatus === "out"
                  ? "bg-red-100 text-red-800"
                  : injury.rtpStatus === "limited"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-800"
            }`}
          >
            {isResolved ? (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Resolved
              </>
            ) : injury.rtpStatus === "out" ? (
              <>
                <AlertCircle className="mr-1 h-4 w-4" />
                Out
              </>
            ) : injury.rtpStatus === "limited" ? (
              <>
                <AlertCircle className="mr-1 h-4 w-4" />
                Limited
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Full Participation
              </>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* RTP Status Controls - Only show for active injuries */}
        {!isResolved && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              Return-to-Play Status
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange("out")}
                disabled={isUpdatingStatus}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  injury.rtpStatus === "out"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                } disabled:opacity-50`}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Out"
                )}
              </button>
              <button
                onClick={() => handleStatusChange("limited")}
                disabled={isUpdatingStatus}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  injury.rtpStatus === "limited"
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100"
                } disabled:opacity-50`}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Limited"
                )}
              </button>
              <button
                onClick={() => handleStatusChange("full")}
                disabled={isUpdatingStatus}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  injury.rtpStatus === "full"
                    ? "bg-green-600 text-white"
                    : "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100"
                } disabled:opacity-50`}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Full"
                )}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={handleClearInjury}
                disabled={isUpdatingStatus}
                className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Clear Injury (Mark as Resolved)"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Reopen button for resolved injuries */}
        {isResolved && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              Injury Status
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              This injury was resolved on {injury.resolvedDate}.
            </p>
            <button
              onClick={handleReopenInjury}
              disabled={isUpdatingStatus}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                "Reopen Injury"
              )}
            </button>
          </div>
        )}

        {/* Injury Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Injury Details</h2>
            {isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEditing}
                  disabled={isSaving}
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <Calendar className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs text-muted-foreground">Injury Date</p>
                <p className="text-sm font-medium">{injury.injuryDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <Activity className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs text-muted-foreground">Body Region</p>
                <p className="text-sm font-medium">
                  {formatBodyRegion(injury.bodyRegion)}
                  {injury.side !== "NA" && ` (${injury.side})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <User className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs text-muted-foreground">Created By</p>
                <p className="text-sm font-medium">{injury.createdByName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
              <Calendar className="h-4 w-4 text-slate-500" />
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium">
                  {new Date(injury.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Mechanism */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-1">
              Mechanism of Injury
            </p>
            {isEditing ? (
              <textarea
                value={editMechanism}
                onChange={(e) => setEditMechanism(e.target.value)}
                placeholder="How did the injury occur?"
                className="w-full p-3 rounded-lg border border-slate-200 text-sm resize-none"
                rows={2}
              />
            ) : (
              <p className="text-sm text-slate-700">
                {injury.mechanism || (
                  <span className="italic text-muted-foreground">
                    No mechanism recorded
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Diagnosis */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
            {isEditing ? (
              <textarea
                value={editDiagnosis}
                onChange={(e) => setEditDiagnosis(e.target.value)}
                placeholder="Clinical diagnosis"
                className="w-full p-3 rounded-lg border border-slate-200 text-sm resize-none"
                rows={2}
              />
            ) : (
              <p className="text-sm text-slate-700">
                {injury.diagnosis || (
                  <span className="italic text-muted-foreground">
                    No diagnosis recorded
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Documentation / Encounters */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Documentation
            </h2>
            <span className="text-sm text-muted-foreground">
              {injuryEncounters?.length || 0} records
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {!injuryEncounters ? (
              <div className="p-5 text-center">
                <Loader2 className="h-6 w-6 text-slate-300 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : injuryEncounters.length === 0 ? (
              <div className="p-5 text-center">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No documentation yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create an encounter from the athlete profile
                </p>
              </div>
            ) : (
              injuryEncounters.map((enc) => (
                <button
                  key={enc._id}
                  onClick={() => handleViewEncounter(enc._id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        enc.encounterType === "initial_eval"
                          ? "bg-blue-100 text-blue-600"
                          : enc.encounterType === "rtp_clearance"
                            ? "bg-green-100 text-green-600"
                            : enc.encounterType === "daily_care"
                              ? "bg-purple-100 text-purple-600"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatEncounterType(enc.encounterType)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(enc.encounterDatetime).toLocaleDateString()} •{" "}
                        {enc.providerName}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Rehab Programs */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-purple-500" />
              Rehab Programs
            </h2>
            <span className="text-sm text-muted-foreground">
              {rehabPrograms?.length || 0} programs
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {!rehabPrograms ? (
              <div className="p-5 text-center">
                <Loader2 className="h-6 w-6 text-slate-300 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : rehabPrograms.length === 0 ? (
              <div className="p-5 text-center">
                <Dumbbell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No rehab programs yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a rehab program from the athlete profile
                </p>
              </div>
            ) : (
              rehabPrograms.map((program) => (
                <div
                  key={program._id}
                  className="px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        program.status === "active"
                          ? "bg-purple-100 text-purple-600"
                          : program.status === "completed"
                            ? "bg-green-100 text-green-600"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {program.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Started: {program.startDate} • {program.exerciseCount} exercises
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      program.status === "active"
                        ? "bg-purple-100 text-purple-700"
                        : program.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                    }`}>
                      {program.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
