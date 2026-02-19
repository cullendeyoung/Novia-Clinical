import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Mic,
  MicOff,
  FileText,
  Activity,
  Save,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

const ENCOUNTER_TYPES = [
  { value: "daily_care", label: "Daily Care / Treatment" },
  { value: "soap_followup", label: "SOAP Follow-Up" },
  { value: "initial_eval", label: "Initial Evaluation" },
  { value: "rtp_clearance", label: "Return-to-Play Clearance" },
  { value: "other", label: "Other" },
];

export default function NewEncounterForm() {
  const {
    selectedAthleteId,
    setViewMode,
    setSelectedEncounterId,
  } = useATContext();

  const athlete = useQuery(
    api.athletes.getById,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const activeInjuries = useQuery(
    api.injuries.getByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId, status: "active" } : "skip"
  );

  const createEncounter = useMutation(api.encounters.create);

  // Form state
  const [encounterType, setEncounterType] = useState("daily_care");
  const [injuryId, setInjuryId] = useState<Id<"injuries"> | "">("");
  const [subjectiveText, setSubjectiveText] = useState("");
  const [objectiveText, setObjectiveText] = useState("");
  const [assessmentText, setAssessmentText] = useState("");
  const [planText, setPlanText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleBackToProfile = () => {
    setViewMode("profile");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAthleteId) return;

    // Require at least some content
    if (!subjectiveText && !objectiveText && !assessmentText && !planText) {
      toast.error("Please add at least some clinical notes");
      return;
    }

    setIsSaving(true);
    try {
      const encounterId = await createEncounter({
        athleteId: selectedAthleteId,
        encounterType: encounterType as "daily_care" | "soap_followup" | "initial_eval" | "rtp_clearance" | "other",
        injuryId: injuryId ? (injuryId as Id<"injuries">) : undefined,
        subjectiveText: subjectiveText || undefined,
        objectiveText: objectiveText || undefined,
        assessmentText: assessmentText || undefined,
        planText: planText || undefined,
        aiGenerated: false,
      });

      toast.success("Encounter saved successfully");
      setSelectedEncounterId(encounterId);
      setViewMode("encounter");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save encounter";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      toast.success("Recording stopped - transcription coming soon!");
    } else {
      setIsRecording(true);
      toast("Recording started...", { icon: "🎤" });
    }
  };

  if (!athlete) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

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
            Cancel
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">New Encounter</h1>
            <p className="text-muted-foreground mt-1">
              Documenting for {athlete.firstName} {athlete.lastName}
            </p>
          </div>

          {/* Voice Recording Button */}
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            onClick={toggleRecording}
            className="gap-2"
          >
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Start Recording
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 max-w-4xl">
        {/* Recording Indicator */}
        {isRecording && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm text-red-700 font-medium">
              Recording in progress... Speak naturally and describe the encounter.
            </p>
          </div>
        )}

        {/* Encounter Type & Injury Selection */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div>
            <Label htmlFor="encounterType">Encounter Type</Label>
            <Select
              value={encounterType}
              onChange={(e) => setEncounterType(e.target.value)}
              options={ENCOUNTER_TYPES}
            />
          </div>
          <div>
            <Label htmlFor="injuryId">Related Injury (Optional)</Label>
            <select
              id="injuryId"
              value={injuryId}
              onChange={(e) => setInjuryId(e.target.value as Id<"injuries"> | "")}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">No specific injury</option>
              {activeInjuries?.map((injury) => (
                <option key={injury._id} value={injury._id}>
                  {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                  {injury.diagnosis && ` - ${injury.diagnosis}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SOAP Sections */}
        <div className="space-y-6">
          {/* Subjective */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3 bg-blue-50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <h2 className="font-semibold text-blue-900">Subjective</h2>
                <p className="text-xs text-blue-600">Patient's description, symptoms, and history</p>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={subjectiveText}
                onChange={(e) => setSubjectiveText(e.target.value)}
                placeholder="Chief complaint, history of present illness, pain levels, patient's description of symptoms..."
                className="w-full min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
              />
            </div>
          </div>

          {/* Objective */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3 bg-green-50 flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <h2 className="font-semibold text-green-900">Objective</h2>
                <p className="text-xs text-green-600">Clinical findings, measurements, and observations</p>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={objectiveText}
                onChange={(e) => setObjectiveText(e.target.value)}
                placeholder="Physical exam findings, ROM measurements, strength testing, palpation findings, special tests..."
                className="w-full min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
              />
            </div>
          </div>

          {/* Assessment */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3 bg-amber-50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              <div>
                <h2 className="font-semibold text-amber-900">Assessment</h2>
                <p className="text-xs text-amber-600">Clinical impression and diagnosis</p>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={assessmentText}
                onChange={(e) => setAssessmentText(e.target.value)}
                placeholder="Working diagnosis, differential diagnoses, clinical impression, prognosis..."
                className="w-full min-h-[100px] rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
              />
            </div>
          </div>

          {/* Plan */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3 bg-purple-50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <div>
                <h2 className="font-semibold text-purple-900">Plan</h2>
                <p className="text-xs text-purple-600">Treatment plan, referrals, and follow-up</p>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder="Treatment provided, modalities used, exercises prescribed, return-to-play guidelines, follow-up instructions..."
                className="w-full min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackToProfile}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Encounter
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
