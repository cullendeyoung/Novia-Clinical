import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Users,
  FileText,
  Mic,
  ChevronDown,
  Plus,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

const ENCOUNTER_TYPES = [
  { value: "initial_eval", label: "Initial Evaluation", description: "First assessment of a new injury or condition" },
  { value: "daily_care", label: "Daily Care / Treatment", description: "Routine treatment and therapy sessions" },
  { value: "soap_followup", label: "Follow-Up / Progress Note", description: "Check-in on existing injury progress" },
  { value: "rehab_program", label: "Rehab / Exercise Program", description: "Create exercise program linked to an injury" },
  { value: "rtp_clearance", label: "Return-to-Play Clearance", description: "Final clearance assessment" },
  { value: "other", label: "Other Documentation", description: "General notes and documentation" },
];

interface ATWelcomeProps {
  showStartDocumentInitially?: boolean;
}

export default function ATWelcome({ showStartDocumentInitially = false }: ATWelcomeProps) {
  const { setSelectedAthleteId, setSelectedTeamId, setViewMode } = useATContext();
  const [showStartDocument, setShowStartDocument] = useState(showStartDocumentInitially);
  const [selectedAthlete, setSelectedAthlete] = useState<Id<"athletes"> | "">("");
  const [selectedTeam, setSelectedTeam] = useState<Id<"teams"> | "">("");
  const [selectedEncounterType, setSelectedEncounterType] = useState("");

  const teams = useQuery(api.teams.list, {});
  const athletes = useQuery(
    api.athletes.listByTeam,
    selectedTeam ? { teamId: selectedTeam } : "skip"
  );

  const handleStartDocument = () => {
    if (!selectedAthlete || !selectedEncounterType) return;

    setSelectedAthleteId(selectedAthlete);
    if (selectedTeam) {
      setSelectedTeamId(selectedTeam);
    }

    // Route to rehab program form if that type is selected
    if (selectedEncounterType === "rehab_program") {
      setViewMode("rehab-program");
    } else {
      setViewMode("new-encounter");
    }
  };

  const handleAthleteChange = (athleteId: string) => {
    setSelectedAthlete(athleteId as Id<"athletes"> | "");
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId as Id<"teams"> | "");
    setSelectedAthlete(""); // Reset athlete when team changes
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg">
        {!showStartDocument ? (
          // Initial state - simple prompt
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-6">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Ready to Document
            </h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Select an athlete from the roster on the left, or start a new document below.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => setShowStartDocument(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-5 w-5" />
                Start a Document
              </Button>
            </div>

            {/* Hint about ambient notes */}
            <div className="mt-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 text-sm">Voice-Powered Notes</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Use ambient recording to capture encounters hands-free. AI will help format your notes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Start document flow
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Start a Document
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowStartDocument(false);
                  setSelectedAthlete("");
                  setSelectedTeam("");
                  setSelectedEncounterType("");
                }}
              >
                Cancel
              </Button>
            </div>

            {/* Team Selection */}
            <div className="mb-4">
              <Label htmlFor="team" className="text-sm font-medium text-slate-700 mb-1.5 block">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  Select Team
                </span>
              </Label>
              <div className="relative">
                <select
                  id="team"
                  value={selectedTeam}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Choose a team...</option>
                  {teams?.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name} ({team.sport})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Athlete Selection */}
            <div className="mb-6">
              <Label htmlFor="athlete" className="text-sm font-medium text-slate-700 mb-1.5 block">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  Select Athlete
                </span>
              </Label>
              <div className="relative">
                <select
                  id="athlete"
                  value={selectedAthlete}
                  onChange={(e) => handleAthleteChange(e.target.value)}
                  disabled={!selectedTeam}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {!selectedTeam ? "Select a team first..." : "Choose an athlete..."}
                  </option>
                  {athletes?.map((athlete) => (
                    <option key={athlete._id} value={athlete._id}>
                      {athlete.firstName} {athlete.lastName}
                      {athlete.jerseyNumber && ` (#${athlete.jerseyNumber})`}
                      {athlete.position && ` - ${athlete.position}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Encounter Type Selection */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Document Type
                </span>
              </Label>
              <div className="grid gap-2">
                {ENCOUNTER_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedEncounterType(type.value)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                      selectedEncounterType === type.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <p className={`font-medium text-sm ${
                      selectedEncounterType === type.value ? "text-primary" : "text-slate-900"
                    }`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedAthlete || !selectedEncounterType}
              onClick={handleStartDocument}
            >
              <Plus className="mr-2 h-5 w-5" />
              Begin Documentation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
