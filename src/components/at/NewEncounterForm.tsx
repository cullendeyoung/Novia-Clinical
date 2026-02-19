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
  Save,
  Loader2,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

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
    label: "Initial Evaluation",
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
  const [encounterType, setEncounterType] = useState<EncounterType>("daily_care");
  const [noteFormat, setNoteFormat] = useState<NoteFormat>("summary");
  const [injuryId, setInjuryId] = useState<Id<"injuries"> | "">("");
  const [noteContent, setNoteContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    setViewMode("profile");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAthleteId) return;

    if (!noteContent.trim()) {
      toast.error("Please add some documentation");
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

      const encounterId = await createEncounter({
        athleteId: selectedAthleteId,
        encounterType,
        injuryId: injuryId ? (injuryId as Id<"injuries">) : undefined,
        subjectiveText,
        objectiveText,
        assessmentText,
        planText,
        aiGenerated: false,
      });

      toast.success("Document saved successfully");
      setSelectedEncounterId(encounterId);
      setViewMode("encounter");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save document";
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

  // Insert SOAP template into the note content
  const insertSOAPTemplate = () => {
    const template = `SUBJECTIVE:


OBJECTIVE:


ASSESSMENT:


PLAN:

`;
    setNoteContent(template);
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
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
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
            <h1 className="text-xl font-semibold text-slate-900">New Document</h1>
            <p className="text-muted-foreground mt-0.5">
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

        {/* Encounter Type & Format Selection */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div>
            <Label htmlFor="encounterType">Document Type</Label>
            <Select
              value={encounterType}
              onChange={(e) => handleEncounterTypeChange(e.target.value as EncounterType)}
              options={ENCOUNTER_TYPES}
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
                  className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            {noteFormat === "soap" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={insertSOAPTemplate}
                className="text-xs"
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
              className="w-full min-h-[400px] rounded-md border border-slate-200 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y font-mono"
            />
          </div>
        </div>

        {/* Hint */}
        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Use the voice recording feature to dictate your notes hands-free.
            AI will help format your transcribed audio into the selected format.
          </p>
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
          <Button type="submit" disabled={isSaving || !noteContent.trim()}>
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
