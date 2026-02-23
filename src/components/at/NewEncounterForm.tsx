import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  Mic,
  FileText,
  Save,
  Loader2,
  ChevronDown,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAudioRecorder, formatDuration } from "@/hooks/useAudioRecorder";

type EncounterType = "daily_care" | "soap_followup" | "initial_eval" | "rtp_clearance" | "rehab_program" | "other";
type NoteFormat = "summary" | "soap" | "rtp_form";

interface EncounterTypeConfig {
  label: string;
  description: string;
  defaultFormat: NoteFormat;
  formatOptions?: { value: NoteFormat; label: string }[];
  placeholders: Partial<Record<NoteFormat, string>>;
  isRehabProgram?: boolean;
}

// Format-specific placeholder templates
const SOAP_PLACEHOLDER = `Document using SOAP format:

SUBJECTIVE:
[Patient's reported symptoms, pain levels, how they're feeling]

OBJECTIVE:
[Clinical findings, ROM, strength testing, observations]

ASSESSMENT:
[Clinical impression, progress status]

PLAN:
[Treatment plan, exercises, follow-up schedule]`;

const SUMMARY_PLACEHOLDER = `Document the treatment and observations...

Example:
Treatment: 15 min ice, 10 min e-stim to R knee
Response: Patient reports 2/10 pain post-treatment (down from 4/10)
Notes: Continue current protocol, reassess in 2 days`;

const RTP_PLACEHOLDER = `Document the return-to-play assessment...

Include:
- Current status and functional testing results
- Criteria met for clearance
- Any activity restrictions or modifications
- Clearance level (full, limited, not cleared)
- Follow-up recommendations`;

const ENCOUNTER_TYPE_CONFIG: Record<EncounterType, EncounterTypeConfig> = {
  daily_care: {
    label: "Daily Care / Treatment",
    description: "Routine treatment and therapy sessions",
    defaultFormat: "summary",
    placeholders: {
      summary: SUMMARY_PLACEHOLDER,
    },
  },
  soap_followup: {
    label: "Follow-Up / Progress Note",
    description: "Check-in on existing injury progress",
    defaultFormat: "soap",
    formatOptions: [
      { value: "soap", label: "SOAP Note" },
      { value: "summary", label: "Summary" },
    ],
    placeholders: {
      soap: SOAP_PLACEHOLDER,
      summary: `Document the follow-up assessment...

Example:
Status: Athlete reports improved pain, now 3/10 at rest
Treatment provided: ROM exercises, ice, e-stim
Progress: Range of motion improving, strength at 4/5
Next steps: Continue current protocol, increase activity as tolerated`,
    },
  },
  initial_eval: {
    label: "Initial Eval / New Injury",
    description: "First assessment of a new injury or condition",
    defaultFormat: "soap",
    formatOptions: [
      { value: "soap", label: "SOAP Note" },
      { value: "summary", label: "Summary" },
    ],
    placeholders: {
      soap: `Document the initial evaluation using SOAP format:

SUBJECTIVE:
[Chief complaint, mechanism of injury, pain description, history]

OBJECTIVE:
[Physical exam findings, special tests, ROM, strength, palpation]

ASSESSMENT:
[Working diagnosis, differential diagnoses]

PLAN:
[Treatment plan, referrals, activity modifications, follow-up]`,
      summary: `Document the initial evaluation...

Example:
Injury: Right knee pain following non-contact twist during practice
Mechanism: Planted foot, rotated, felt pop
Findings: Mild swelling, positive Lachman, ROM limited
Plan: X-ray ordered, refer to ortho, crutches and ice protocol`,
    },
  },
  rehab_program: {
    label: "Rehab / Exercise Program",
    description: "Create exercise program linked to an injury",
    defaultFormat: "summary",
    placeholders: {},
    isRehabProgram: true,
  },
  rtp_clearance: {
    label: "Return-to-Play Clearance",
    description: "Final clearance assessment",
    defaultFormat: "rtp_form",
    formatOptions: [
      { value: "rtp_form", label: "RTP Clearance Form" },
      { value: "soap", label: "SOAP Note" },
      { value: "summary", label: "Summary" },
    ],
    placeholders: {
      rtp_form: RTP_PLACEHOLDER,
      soap: SOAP_PLACEHOLDER,
      summary: `Document the return-to-play assessment...

Example:
Status: Athlete has completed all rehab protocols
Testing: Full ROM, strength 5/5 bilateral, passed functional testing
Clearance: Full clearance granted for return to sport
Follow-up: Monitor during first week back, reassess PRN`,
    },
  },
  other: {
    label: "Other Documentation",
    description: "General notes and documentation",
    defaultFormat: "summary",
    placeholders: {
      summary: "Enter your documentation...",
    },
  },
};

const ENCOUNTER_TYPES = Object.entries(ENCOUNTER_TYPE_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

type ProcessingState = "idle" | "uploading" | "transcribing" | "generating" | "complete";

export default function NewEncounterForm() {
  const {
    selectedAthleteId,
    setViewMode,
    setSelectedEncounterId,
    preSelectedEncounterType,
    setPreSelectedEncounterType,
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
  const createInjury = useMutation(api.injuries.create);
  const generateUploadUrl = useMutation(api.encounters.generateUploadUrl);
  const processAmbientRecording = useAction(api.transcription.processAmbientRecording);

  // Form state - use preSelectedEncounterType if available
  const [encounterType, setEncounterType] = useState<EncounterType>(
    preSelectedEncounterType || "daily_care"
  );
  const [noteFormat, setNoteFormat] = useState<NoteFormat>(
    preSelectedEncounterType
      ? ENCOUNTER_TYPE_CONFIG[preSelectedEncounterType]?.defaultFormat || "summary"
      : "summary"
  );

  const [injuryId, setInjuryId] = useState<Id<"injuries"> | "">("");
  const [newInjuryTitle, setNewInjuryTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Recording and transcription state
  const { state: recordingState, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [transcript, setTranscript] = useState<string>("");

  const currentConfig = ENCOUNTER_TYPE_CONFIG[encounterType];

  // Update format when encounter type changes
  const handleEncounterTypeChange = (type: EncounterType) => {
    // If rehab program is selected, redirect to the rehab program form
    if (type === "rehab_program") {
      setViewMode("rehab-program");
      return;
    }
    setEncounterType(type);
    setNoteFormat(ENCOUNTER_TYPE_CONFIG[type].defaultFormat);
  };

  const handleBackToProfile = () => {
    if (recordingState.isRecording) {
      cancelRecording();
    }
    setPreSelectedEncounterType(null);
    setViewMode("profile");
  };

  const handleStartRecording = async () => {
    try {
      toast("Requesting microphone access...", { icon: "🎤" });
      await startRecording();
      toast.success("Recording started!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start recording";
      toast.error(message);
    }
  };

  const handleStopRecording = async () => {
    try {
      const audioBlob = await stopRecording();

      if (!audioBlob) {
        toast.error("No audio recorded");
        return;
      }

      // Get the selected injury context if any
      const selectedInjury = activeInjuries?.find(i => i._id === injuryId);
      const injuryContext = selectedInjury
        ? `${selectedInjury.bodyRegion} ${selectedInjury.side !== "NA" ? `(${selectedInjury.side})` : ""} ${selectedInjury.diagnosis || ""}`.trim()
        : undefined;

      // Step 1: Upload audio to Convex storage
      setProcessingState("uploading");
      toast("Uploading audio...", { icon: "📤" });

      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": audioBlob.type },
        body: audioBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio");
      }

      const { storageId } = await uploadResponse.json();

      // Step 2: Process the recording (transcribe + generate SOAP)
      setProcessingState("transcribing");
      toast("Transcribing audio...", { icon: "🎧" });

      const result = await processAmbientRecording({
        storageId,
        encounterType,
        noteFormat, // Pass the selected note format to AI
        athleteName: athlete ? `${athlete.firstName} ${athlete.lastName}` : undefined,
        injuryContext,
      });

      setTranscript(result.transcript);
      setProcessingState("complete");

      // Format the note based on the selected format
      if (noteFormat === "soap") {
        const soapContent = `SUBJECTIVE:
${result.subjective}

OBJECTIVE:
${result.objective}

ASSESSMENT:
${result.assessment}

PLAN:
${result.plan}`;
        setNoteContent(soapContent);
      } else if (noteFormat === "rtp_form") {
        // RTP Clearance format
        const rtpContent = `RETURN-TO-PLAY CLEARANCE ASSESSMENT

CURRENT STATUS:
${result.subjective}

FUNCTIONAL TESTING:
${result.objective}

CLEARANCE DETERMINATION:
${result.assessment}

ACTIVITY LEVEL & RESTRICTIONS:
${result.plan}

SUMMARY: ${result.summary}`;
        setNoteContent(rtpContent);
      } else {
        // Summary format - use the summary as the main content
        setNoteContent(result.summary);
      }

      toast.success("Note generated from recording!");
      setProcessingState("idle");

    } catch (error) {
      console.error("Recording processing error:", error);
      const message = error instanceof Error ? error.message : "Failed to process recording";
      toast.error(message);
      setProcessingState("idle");
    }
  };

  const toggleRecording = async () => {
    if (recordingState.isRecording) {
      await handleStopRecording();
    } else {
      await handleStartRecording();
    }
  };

  const saveDocument = async (showUploadSuccess: boolean = false) => {
    if (!selectedAthleteId) return;

    if (!noteContent.trim()) {
      toast.error("Please add some documentation");
      return;
    }

    // Validate new injury title for Initial Eval
    if (encounterType === "initial_eval" && !newInjuryTitle.trim() && !injuryId) {
      toast.error("Please enter a new injury title for the initial evaluation");
      return;
    }

    setIsSaving(true);
    try {
      // Parse content based on format
      let subjectiveText: string | undefined;
      let objectiveText: string | undefined;
      let assessmentText: string | undefined;
      let planText: string | undefined;

      if (noteFormat === "soap") {
        // Try to parse SOAP sections from the content
        const sections = parseSOAPContent(noteContent);
        subjectiveText = sections.subjective || undefined;
        objectiveText = sections.objective || undefined;
        assessmentText = sections.assessment || undefined;
        planText = sections.plan || undefined;
      } else {
        // For summary format, put everything in subjective for now
        // This will be stored as a general note
        subjectiveText = noteContent;
      }

      // For Initial Eval with new injury title, create the injury first
      let linkedInjuryId = injuryId ? (injuryId as Id<"injuries">) : undefined;

      if (encounterType === "initial_eval" && newInjuryTitle.trim() && !injuryId) {
        // Create the new injury
        const newInjuryId = await createInjury({
          athleteId: selectedAthleteId,
          injuryDate: new Date().toISOString().split("T")[0],
          bodyRegion: newInjuryTitle.trim(), // Use the title as body region for now
          side: "NA" as const,
          rtpStatus: "out" as const,
        });
        linkedInjuryId = newInjuryId;
      }

      const encounterId = await createEncounter({
        athleteId: selectedAthleteId,
        encounterType,
        injuryId: linkedInjuryId,
        subjectiveText,
        objectiveText,
        assessmentText,
        planText,
        transcriptText: transcript || undefined,
        aiGenerated: !!transcript, // Mark as AI-generated if we have a transcript
      });

      if (showUploadSuccess) {
        toast.success("Document uploaded to EMR successfully!");
      } else {
        toast.success("Document saved successfully");
      }
      setPreSelectedEncounterType(null);
      setSelectedEncounterId(encounterId);
      setViewMode("encounter");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save document";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDocument(false);
  };

  const handleUploadToEMR = async () => {
    await saveDocument(true);
  };

  // Insert SOAP template into the note content
  const insertSOAPTemplate = () => {
    const template = `SUBJECTIVE:


OBJECTIVE:


ASSESSMENT:


PLAN:

`;
    setNoteContent(template);
  };

  const isProcessing = processingState !== "idle";
  const processingMessage = {
    uploading: "Uploading audio...",
    transcribing: "Transcribing with AI...",
    generating: "Generating SOAP note...",
    complete: "Processing complete!",
    idle: "",
  }[processingState];

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
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToProfile}
            className="text-muted-foreground"
            disabled={recordingState.isRecording || isProcessing}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">New Document</h1>
            <p className="text-muted-foreground mt-0.5">
              Documenting for {athlete.firstName} {athlete.lastName}
            </p>
          </div>

          {/* Voice Recording Button */}
          <div className="flex items-center gap-2">
            {recordingState.isRecording && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium">
                  {formatDuration(recordingState.duration)}
                </span>
              </div>
            )}
            <Button
              type="button"
              variant={recordingState.isRecording ? "destructive" : "outline"}
              onClick={toggleRecording}
              disabled={isProcessing}
              className="gap-2"
            >
              {recordingState.isRecording ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop & Process
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
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 max-w-4xl">
        {/* Recording Indicator */}
        {recordingState.isRecording && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm text-red-700 font-medium">
              Recording in progress... Speak naturally and describe the encounter.
            </p>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="text-sm text-blue-700 font-medium">{processingMessage}</p>
              <p className="text-xs text-blue-600 mt-0.5">
                This may take a moment depending on recording length
              </p>
            </div>
          </div>
        )}

        {/* AI Generated Notice */}
        {transcript && processingState === "idle" && (
          <div className="mb-6 rounded-lg bg-purple-50 border border-purple-200 px-4 py-3 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700 font-medium">AI-Generated Note</p>
              <p className="text-xs text-purple-600 mt-0.5">
                Review and edit the generated content before saving
              </p>
            </div>
          </div>
        )}

        {/* Encounter Type & Format Selection */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div>
            <Label htmlFor="encounterType">Document Type</Label>
            <Select
              value={encounterType}
              onChange={(e) => handleEncounterTypeChange(e.target.value as EncounterType)}
              options={ENCOUNTER_TYPES}
              disabled={recordingState.isRecording || isProcessing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {currentConfig.description}
            </p>
          </div>

          {currentConfig.formatOptions && (
            <div>
              <Label htmlFor="noteFormat">Format</Label>
              <div className="relative">
                <select
                  id="noteFormat"
                  value={noteFormat}
                  onChange={(e) => setNoteFormat(e.target.value as NoteFormat)}
                  disabled={recordingState.isRecording || isProcessing}
                  className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                >
                  {currentConfig.formatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="injuryId">Related Injury (Optional)</Label>
            <div className="relative">
              <select
                id="injuryId"
                value={injuryId}
                onChange={(e) => setInjuryId(e.target.value as Id<"injuries"> | "")}
                disabled={recordingState.isRecording || isProcessing}
                className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              >
                <option value="">No specific injury</option>
                {activeInjuries?.map((injury) => (
                  <option key={injury._id} value={injury._id}>
                    {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                    {injury.diagnosis && ` - ${injury.diagnosis}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* New Injury Title - Only shown for Initial Eval */}
        {encounterType === "initial_eval" && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Label htmlFor="newInjuryTitle" className="text-amber-900 font-medium">
              New Injury Title
            </Label>
            <Input
              id="newInjuryTitle"
              value={newInjuryTitle}
              onChange={(e) => setNewInjuryTitle(e.target.value)}
              placeholder="e.g., Right Knee ACL Sprain, Left Ankle Inversion"
              disabled={recordingState.isRecording || isProcessing}
              className="mt-2 bg-white"
            />
            <p className="text-xs text-amber-700 mt-1">
              Enter a brief title for this new injury (e.g., body part + condition)
            </p>
          </div>
        )}

        {/* Single Note Entry Box */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <div>
                <h2 className="font-semibold text-slate-900">
                  {noteFormat === "soap" ? "SOAP Note" : noteFormat === "rtp_form" ? "RTP Clearance" : "Documentation"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {noteFormat === "soap"
                    ? "Include SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN headers"
                    : "Enter your clinical notes below"}
                </p>
              </div>
            </div>
            {noteFormat === "soap" && !transcript && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={insertSOAPTemplate}
                className="text-xs"
                disabled={recordingState.isRecording || isProcessing}
              >
                Insert Template
              </Button>
            )}
          </div>
          <div className="p-4">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={currentConfig.placeholders[noteFormat] || currentConfig.placeholders[currentConfig.defaultFormat] || "Enter your documentation..."}
              disabled={recordingState.isRecording || isProcessing}
              className="w-full min-h-[400px] rounded-md border border-slate-200 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y font-mono disabled:opacity-50 disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* Upload to EMR Button - Prominent placement */}
        <div className="mt-4">
          <Button
            type="button"
            disabled={isSaving || !noteContent.trim() || recordingState.isRecording || isProcessing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-base"
            onClick={handleUploadToEMR}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Uploading to EMR...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Upload to EMR
              </>
            )}
          </Button>
        </div>

        {/* Hint */}
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Use the voice recording feature to dictate your notes hands-free.
            AI will transcribe your audio and format it into a structured note.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackToProfile}
            disabled={recordingState.isRecording || isProcessing}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="outline"
              disabled={isSaving || !noteContent.trim() || recordingState.isRecording || isProcessing}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Document
                </>
              )}
            </Button>
            <Button
              type="button"
              disabled={isSaving || !noteContent.trim() || recordingState.isRecording || isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUploadToEMR}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload to EMR
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Helper function to parse SOAP content from a single text block
function parseSOAPContent(content: string): {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
} {
  const result: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  } = {};

  // Define section patterns
  const patterns = [
    { key: "subjective" as const, regex: /SUBJECTIVE:?\s*/i },
    { key: "objective" as const, regex: /OBJECTIVE:?\s*/i },
    { key: "assessment" as const, regex: /ASSESSMENT:?\s*/i },
    { key: "plan" as const, regex: /PLAN:?\s*/i },
  ];

  // Find positions of each section
  const positions: { key: keyof typeof result; start: number; end: number }[] = [];

  patterns.forEach(({ key, regex }) => {
    const match = content.match(regex);
    if (match && match.index !== undefined) {
      positions.push({
        key,
        start: match.index + match[0].length,
        end: content.length,
      });
    }
  });

  // Sort by position
  positions.sort((a, b) => a.start - b.start);

  // Set end positions based on next section start
  for (let i = 0; i < positions.length - 1; i++) {
    positions[i].end = positions[i + 1].start - patterns.find(p => p.key === positions[i + 1].key)!.regex.toString().length + 10;
  }

  // Recalculate ends more accurately
  for (let i = 0; i < positions.length; i++) {
    if (i < positions.length - 1) {
      // Find the start of the next section header
      const nextPattern = patterns.find(p => p.key === positions[i + 1].key);
      if (nextPattern) {
        const nextMatch = content.slice(positions[i].start).match(nextPattern.regex);
        if (nextMatch && nextMatch.index !== undefined) {
          positions[i].end = positions[i].start + nextMatch.index;
        }
      }
    }
  }

  // Extract content for each section
  positions.forEach(({ key, start, end }) => {
    const sectionContent = content.slice(start, end).trim();
    if (sectionContent) {
      result[key] = sectionContent;
    }
  });

  return result;
}
