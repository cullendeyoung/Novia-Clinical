import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Ruler,
  AlertCircle,
  Activity,
  FileText,
  Shield,
  Plus,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronRight,
  Edit,
  Heart,
  Archive,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import EditAthleteForm from "./EditAthleteForm";

type AvailabilityStatus = "healthy" | "limited" | "out";

export default function AthleteProfile() {
  const { selectedAthleteId, setViewMode, setSelectedEncounterId } = useATContext();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState<string | null>(null);
  const [updatingInjuryStatus, setUpdatingInjuryStatus] = useState<string | null>(null);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: true,
    emergency: false,
    medical: false,
    insurance: false,
  });

  const athlete = useQuery(
    api.athletes.getById,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const injuries = useQuery(
    api.injuries.getByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const encounters = useQuery(
    api.encounters.getByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId, limit: 5 } : "skip"
  );

  const rehabPrograms = useQuery(
    api.rehabPrograms.getActiveByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  // Get encounters for the selected injury
  const injuryEncounters = useQuery(
    api.encounters.getByInjury,
    selectedInjuryId ? { injuryId: selectedInjuryId as Id<"injuries"> } : "skip"
  );

  // Get archived encounters
  const archivedEncounters = useQuery(
    api.encounters.getArchivedByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const updateAvailabilityStatus = useMutation(api.athletes.updateAvailabilityStatus);
  const unarchiveEncounter = useMutation(api.encounters.unarchive);
  const updateInjury = useMutation(api.injuries.update);
  const resolveInjury = useMutation(api.injuries.resolve);

  if (!athlete) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-muted-foreground">Loading athlete profile...</p>
      </div>
    );
  }

  const formatHeight = (inches?: number) => {
    if (!inches) return null;
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  const activeInjuries = injuries?.filter((i) => i.status === "active") || [];
  const resolvedInjuries = injuries?.filter((i) => i.status === "resolved") || [];

  const handleNewEncounter = () => {
    setSelectedEncounterId(null);
    setViewMode("new-encounter");
  };

  const handleNewRehabProgram = () => {
    setViewMode("rehab-program");
  };

  const handleStatusChange = async (newStatus: AvailabilityStatus) => {
    if (!selectedAthleteId) return;

    setIsUpdatingStatus(true);
    try {
      await updateAvailabilityStatus({
        athleteId: selectedAthleteId,
        status: newStatus,
      });
      toast.success(`Status updated to ${newStatus === "healthy" ? "Healthy" : newStatus === "limited" ? "Limited" : "Out"}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update status";
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get current availability status (defaults to healthy if not set)
  const currentStatus: AvailabilityStatus = athlete?.availabilityStatus ?? "healthy";

  const getStatusStyles = (status: AvailabilityStatus) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-700 border-green-200";
      case "limited":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "out":
        return "bg-red-100 text-red-700 border-red-200";
    }
  };

  // Check if sections have data
  const hasMedicalInfo = athlete.allergies || athlete.medications || athlete.medicalConditions || athlete.previousSurgeries || athlete.previousInjuries;
  const hasInsurance = athlete.insuranceProvider || athlete.insurancePolicyNumber;

  // Show edit form if editing
  if (isEditingProfile && selectedAthleteId) {
    return (
      <EditAthleteForm
        athleteId={selectedAthleteId}
        onClose={() => setIsEditingProfile(false)}
        onSaved={() => setIsEditingProfile(false)}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
              {athlete.jerseyNumber || athlete.firstName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {athlete.firstName} {athlete.lastName}
              </h1>
              <p className="text-muted-foreground">
                {athlete.teamName} • {athlete.position || "No position"}
                {athlete.classYear && ` • ${athlete.classYear}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Availability Status Dropdown */}
            <div className="relative">
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value as AvailabilityStatus)}
                disabled={isUpdatingStatus}
                className={`appearance-none rounded-lg border px-4 py-2 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50 ${getStatusStyles(currentStatus)}`}
              >
                <option value="healthy">Healthy</option>
                <option value="limited">Limited</option>
                <option value="out">Out</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
            </div>
            <Button onClick={handleNewEncounter}>
              <Plus className="mr-2 h-4 w-4" />
              New Encounter
            </Button>
          </div>
        </div>

        {/* Active Injuries Alert */}
        {activeInjuries.length > 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center gap-2 text-amber-700 font-medium">
              <AlertCircle className="h-5 w-5" />
              <span>{activeInjuries.length} Active Injur{activeInjuries.length === 1 ? "y" : "ies"}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeInjuries.map((injury) => (
                <span
                  key={injury._id}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                    injury.rtpStatus === "out"
                      ? "bg-red-100 text-red-700"
                      : injury.rtpStatus === "limited"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                  <span className="text-xs opacity-75">
                    • {injury.rtpStatus === "out" ? "Out" : injury.rtpStatus === "limited" ? "Limited" : "Full"}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="p-6 grid gap-6 lg:grid-cols-3">
        {/* Left Column - Injuries & Rehab */}
        <div className="space-y-6">
          {/* Active Injuries */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-500" />
                Active Injuries
              </h2>
              <span className="text-sm text-muted-foreground">{activeInjuries.length}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {activeInjuries.length === 0 ? (
                <div className="p-5 text-center">
                  <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active injuries</p>
                </div>
              ) : (
                activeInjuries.map((injury) => (
                  <div key={injury._id}>
                    <button
                      onClick={() => setSelectedInjuryId(selectedInjuryId === injury._id ? null : injury._id)}
                      className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                        selectedInjuryId === injury._id ? "bg-amber-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`font-medium ${
                            selectedInjuryId === injury._id ? "text-amber-900" : "text-slate-900"
                          }`}>
                            {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                          </p>
                          {injury.diagnosis && (
                            <p className="text-sm text-slate-600 mt-0.5">{injury.diagnosis}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Injured: {injury.injuryDate} • {injury.encounterCount} encounters
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              injury.rtpStatus === "out"
                                ? "bg-red-100 text-red-700"
                                : injury.rtpStatus === "limited"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {injury.rtpStatus === "out" ? "Out" : injury.rtpStatus === "limited" ? "Limited" : "Full"}
                          </span>
                          {selectedInjuryId === injury._id ? (
                            <ChevronDown className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </button>
                    {/* Injury Details - shown when injury is selected */}
                    {selectedInjuryId === injury._id && (
                      <div className="bg-amber-50 border-t border-amber-200 px-4 py-3 space-y-4">
                        {/* Change Status Section */}
                        <div>
                          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
                            Change Status
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                setUpdatingInjuryStatus(injury._id);
                                try {
                                  await updateInjury({ injuryId: injury._id as Id<"injuries">, rtpStatus: "out" });
                                  toast.success("Status updated to Out");
                                } catch {
                                  toast.error("Failed to update status");
                                } finally {
                                  setUpdatingInjuryStatus(null);
                                }
                              }}
                              disabled={updatingInjuryStatus === injury._id || injury.rtpStatus === "out"}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                injury.rtpStatus === "out"
                                  ? "bg-red-600 text-white"
                                  : "bg-white text-red-600 border border-red-200 hover:bg-red-50"
                              } disabled:opacity-50`}
                            >
                              Out
                            </button>
                            <button
                              onClick={async () => {
                                setUpdatingInjuryStatus(injury._id);
                                try {
                                  await updateInjury({ injuryId: injury._id as Id<"injuries">, rtpStatus: "limited" });
                                  toast.success("Status updated to Limited");
                                } catch {
                                  toast.error("Failed to update status");
                                } finally {
                                  setUpdatingInjuryStatus(null);
                                }
                              }}
                              disabled={updatingInjuryStatus === injury._id || injury.rtpStatus === "limited"}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                injury.rtpStatus === "limited"
                                  ? "bg-amber-500 text-white"
                                  : "bg-white text-amber-600 border border-amber-200 hover:bg-amber-50"
                              } disabled:opacity-50`}
                            >
                              Limited
                            </button>
                            <button
                              onClick={async () => {
                                setUpdatingInjuryStatus(injury._id);
                                try {
                                  await updateInjury({ injuryId: injury._id as Id<"injuries">, rtpStatus: "full" });
                                  toast.success("Status updated to Full");
                                } catch {
                                  toast.error("Failed to update status");
                                } finally {
                                  setUpdatingInjuryStatus(null);
                                }
                              }}
                              disabled={updatingInjuryStatus === injury._id || injury.rtpStatus === "full"}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                injury.rtpStatus === "full"
                                  ? "bg-green-600 text-white"
                                  : "bg-white text-green-600 border border-green-200 hover:bg-green-50"
                              } disabled:opacity-50`}
                            >
                              Full
                            </button>
                          </div>
                          {/* Clear/Resolve Injury Button */}
                          <button
                            onClick={async () => {
                              setUpdatingInjuryStatus(injury._id);
                              try {
                                await resolveInjury({ injuryId: injury._id as Id<"injuries"> });
                                toast.success("Injury marked as resolved");
                                setSelectedInjuryId(null);
                              } catch {
                                toast.error("Failed to resolve injury");
                              } finally {
                                setUpdatingInjuryStatus(null);
                              }
                            }}
                            disabled={updatingInjuryStatus === injury._id}
                            className="w-full mt-2 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            {updatingInjuryStatus === injury._id ? "Updating..." : "Mark as Cleared / Resolved"}
                          </button>
                        </div>

                        {/* Documentation Section */}
                        <div>
                          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">
                            Documentation for this injury
                          </p>
                          {!injuryEncounters ? (
                            <p className="text-sm text-amber-700">Loading...</p>
                          ) : injuryEncounters.length === 0 ? (
                            <p className="text-sm text-amber-700 italic">No documentation yet</p>
                          ) : (
                            <div className="space-y-2">
                              {injuryEncounters.map((enc) => (
                                <button
                                  key={enc._id}
                                  onClick={() => {
                                    setSelectedEncounterId(enc._id);
                                    setViewMode("encounter");
                                  }}
                                  className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 text-left hover:bg-amber-100 transition-colors border border-amber-200"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">
                                      {enc.encounterType === "initial_eval"
                                        ? "Initial Eval"
                                        : enc.encounterType === "soap_followup"
                                          ? "Follow-Up"
                                          : enc.encounterType === "daily_care"
                                            ? "Daily Care"
                                            : enc.encounterType}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(enc.encounterDatetime).toLocaleDateString()} • {enc.providerName}
                                    </p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-slate-400" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Current Rehab Programs */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-purple-500" />
                Current Programs
              </h2>
              {activeInjuries.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleNewRehabProgram}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="divide-y divide-slate-100">
              {!rehabPrograms || rehabPrograms.length === 0 ? (
                <div className="p-5 text-center">
                  <Dumbbell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active rehab programs</p>
                  {activeInjuries.length > 0 && (
                    <Button onClick={handleNewRehabProgram} size="sm" className="mt-3">
                      <Plus className="mr-1 h-4 w-4" />
                      Create Program
                    </Button>
                  )}
                </div>
              ) : (
                rehabPrograms.map((program) => (
                  <div key={program._id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900">{program.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {program.injuryBodyRegion} • Started {program.startDate}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        {program.exercises.length} exercises
                      </span>
                    </div>
                    {program.description && (
                      <p className="text-sm text-slate-600 mb-3">{program.description}</p>
                    )}
                    <div className="space-y-2">
                      {program.exercises.slice(0, 3).map((exercise) => (
                        <div
                          key={exercise._id}
                          className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-700">{exercise.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {exercise.sets && exercise.reps && `${exercise.sets}x${exercise.reps}`}
                              {exercise.holdSeconds && `${exercise.holdSeconds}s hold`}
                              {exercise.durationMinutes && `${exercise.durationMinutes} min`}
                            </span>
                          </div>
                        </div>
                      ))}
                      {program.exercises.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          +{program.exercises.length - 3} more exercises
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resolved Injuries */}
          {resolvedInjuries.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  Injury History
                </h2>
                <span className="text-sm text-muted-foreground">{resolvedInjuries.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {resolvedInjuries.slice(0, 5).map((injury) => (
                  <div key={injury._id} className="p-4">
                    <p className="font-medium text-slate-900">
                      {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                    </p>
                    {injury.diagnosis && (
                      <p className="text-sm text-slate-600 mt-0.5">{injury.diagnosis}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {injury.injuryDate} - {injury.resolvedDate || "Resolved"}
                    </p>
                  </div>
                ))}
                {resolvedInjuries.length > 5 && (
                  <div className="p-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      +{resolvedInjuries.length - 5} more in history
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Middle Column - Recent Encounters */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Recent Encounters
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{encounters?.length ?? 0}</span>
                {archivedEncounters && archivedEncounters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowArchive(!showArchive)}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 px-2"
                  >
                    <Archive className="h-3.5 w-3.5 mr-1" />
                    Archive ({archivedEncounters.length})
                  </Button>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {!encounters || encounters.length === 0 ? (
                <div className="p-5 text-center">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No encounters yet</p>
                  <Button onClick={handleNewEncounter} size="sm" className="mt-3">
                    <Plus className="mr-1 h-4 w-4" />
                    Create First
                  </Button>
                </div>
              ) : (
                encounters.map((encounter) => (
                  <button
                    key={encounter._id}
                    onClick={() => {
                      setSelectedEncounterId(encounter._id);
                      setViewMode("encounter");
                    }}
                    className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {encounter.encounterType.replace(/_/g, " ")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {new Date(encounter.encounterDatetime).toLocaleDateString()}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            • {encounter.providerName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {encounter.aiGenerated && (
                          <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            AI
                          </span>
                        )}
                        {encounter.isSignedOff && (
                          <span className="text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                            Signed
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Archived Documents Section */}
          {showArchive && archivedEncounters && archivedEncounters.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50">
              <div className="border-b border-amber-200 px-5 py-3 flex items-center justify-between bg-amber-100">
                <h2 className="font-semibold text-amber-900 flex items-center gap-2">
                  <Archive className="h-4 w-4 text-amber-600" />
                  Archived Documents
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchive(false)}
                  className="text-amber-700 hover:text-amber-800 hover:bg-amber-200 h-7 px-2"
                >
                  Hide
                </Button>
              </div>
              <div className="divide-y divide-amber-200">
                {archivedEncounters.map((encounter) => (
                  <div
                    key={encounter._id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-amber-900">
                        {encounter.encounterType.replace(/_/g, " ")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-amber-600" />
                        <p className="text-xs text-amber-700">
                          {new Date(encounter.encounterDatetime).toLocaleDateString()}
                        </p>
                        <span className="text-xs text-amber-600">
                          • {encounter.providerName}
                        </span>
                      </div>
                      {encounter.archivedAt && (
                        <p className="text-xs text-amber-600 mt-1">
                          Archived {new Date(encounter.archivedAt).toLocaleDateString()}
                          {encounter.archivedByName && ` by ${encounter.archivedByName}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setIsUnarchiving(encounter._id);
                          try {
                            await unarchiveEncounter({ encounterId: encounter._id });
                            toast.success("Document restored from archive");
                          } catch (error) {
                            const message = error instanceof Error ? error.message : "Failed to restore document";
                            toast.error(message);
                          } finally {
                            setIsUnarchiving(null);
                          }
                        }}
                        disabled={isUnarchiving === encounter._id}
                        className="text-amber-700 border-amber-300 hover:bg-amber-100"
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
                        className="text-amber-700 hover:bg-amber-100"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Athlete Information Box */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Header with Edit Button */}
            <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between bg-slate-50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4" />
                Athlete Information
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>

            {/* Personal Information - Always visible */}
            <div className="px-5 py-4 space-y-2 border-b border-slate-100">
              {athlete.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-slate-600">{athlete.email}</span>
                </div>
              )}
              {athlete.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-slate-600">{athlete.phone}</span>
                </div>
              )}
              {athlete.dateOfBirth && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-slate-600">
                    {new Date(athlete.dateOfBirth).toLocaleDateString()}
                    {athlete.sex && ` • ${athlete.sex === "M" ? "Male" : athlete.sex === "F" ? "Female" : "Other"}`}
                  </span>
                </div>
              )}
              {(athlete.heightInches || athlete.weightLbs) && (
                <div className="flex items-center gap-2 text-sm">
                  <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-slate-600">
                    {athlete.heightInches && formatHeight(athlete.heightInches)}
                    {athlete.heightInches && athlete.weightLbs && " • "}
                    {athlete.weightLbs && `${athlete.weightLbs} lbs`}
                  </span>
                </div>
              )}
              {!athlete.email && !athlete.phone && !athlete.dateOfBirth && !athlete.heightInches && !athlete.weightLbs && (
                <p className="text-sm text-muted-foreground italic">No personal info on file</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="border-b border-slate-100">
              <button
                onClick={() => toggleSection("emergency")}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-amber-500" />
                  Emergency Contact
                </span>
                {expandedSections.emergency ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedSections.emergency && (
                <div className="px-5 pb-4 space-y-2">
                  {athlete.emergencyContactName ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-900 font-medium">{athlete.emergencyContactName}</span>
                      {athlete.emergencyContactRelationship && (
                        <span className="text-muted-foreground">({athlete.emergencyContactRelationship})</span>
                      )}
                      {athlete.emergencyContactPhone && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-slate-600">{athlete.emergencyContactPhone}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No emergency contact on file</p>
                  )}
                  {athlete.emergencyContact2Name && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-900 font-medium">{athlete.emergencyContact2Name}</span>
                      {athlete.emergencyContact2Relationship && (
                        <span className="text-muted-foreground">({athlete.emergencyContact2Relationship})</span>
                      )}
                      {athlete.emergencyContact2Phone && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-slate-600">{athlete.emergencyContact2Phone}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Medical Info */}
            <div className="border-b border-slate-100">
              <button
                onClick={() => toggleSection("medical")}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Medical Info
                  {hasMedicalInfo && (
                    <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">On file</span>
                  )}
                </span>
                {expandedSections.medical ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedSections.medical && (
                <div className="px-5 pb-4 space-y-3">
                  {athlete.allergies && (
                    <div>
                      <p className="text-xs font-medium text-red-600 uppercase">Allergies</p>
                      <p className="text-sm text-slate-600">{athlete.allergies}</p>
                    </div>
                  )}
                  {athlete.medications && (
                    <div>
                      <p className="text-xs font-medium text-blue-600 uppercase">Medications</p>
                      <p className="text-sm text-slate-600">{athlete.medications}</p>
                    </div>
                  )}
                  {athlete.medicalConditions && (
                    <div>
                      <p className="text-xs font-medium text-amber-600 uppercase">Conditions</p>
                      <p className="text-sm text-slate-600">{athlete.medicalConditions}</p>
                    </div>
                  )}
                  {athlete.previousSurgeries && (
                    <div>
                      <p className="text-xs font-medium text-purple-600 uppercase">Previous Surgeries</p>
                      <p className="text-sm text-slate-600">{athlete.previousSurgeries}</p>
                    </div>
                  )}
                  {athlete.previousInjuries && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 uppercase">Previous Injuries</p>
                      <p className="text-sm text-slate-600">{athlete.previousInjuries}</p>
                    </div>
                  )}
                  {athlete.primaryPhysicianName && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 uppercase">Primary Physician</p>
                      <p className="text-sm text-slate-600">{athlete.primaryPhysicianName}</p>
                      {athlete.primaryPhysicianPhone && (
                        <p className="text-xs text-muted-foreground">{athlete.primaryPhysicianPhone}</p>
                      )}
                    </div>
                  )}
                  {!hasMedicalInfo && !athlete.primaryPhysicianName && (
                    <p className="text-sm text-muted-foreground italic">No medical info on file</p>
                  )}
                </div>
              )}
            </div>

            {/* Insurance Info */}
            <div>
              <button
                onClick={() => toggleSection("insurance")}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  Insurance
                  {hasInsurance && (
                    <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">On file</span>
                  )}
                </span>
                {expandedSections.insurance ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {expandedSections.insurance && (
                <div className="px-5 pb-4 space-y-2">
                  {athlete.insuranceProvider ? (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase">Provider</p>
                        <p className="text-sm font-medium text-slate-900">{athlete.insuranceProvider}</p>
                      </div>
                      {athlete.insurancePolicyNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Policy #</p>
                          <p className="text-sm text-slate-600">{athlete.insurancePolicyNumber}</p>
                        </div>
                      )}
                      {athlete.insuranceGroupNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Group #</p>
                          <p className="text-sm text-slate-600">{athlete.insuranceGroupNumber}</p>
                        </div>
                      )}
                      {athlete.insurancePhone && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Phone</p>
                          <p className="text-sm text-slate-600">{athlete.insurancePhone}</p>
                        </div>
                      )}
                      {athlete.policyHolderName && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase">Policy Holder</p>
                          <p className="text-sm text-slate-600">
                            {athlete.policyHolderName}
                            {athlete.policyHolderRelationship && ` (${athlete.policyHolderRelationship})`}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No insurance info on file</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes section if present */}
          {athlete.notes && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="font-semibold text-slate-900">Notes</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{athlete.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
