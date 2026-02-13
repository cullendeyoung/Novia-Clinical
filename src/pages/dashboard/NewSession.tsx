import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Mic, MicOff, FileText } from "lucide-react";

const SESSION_TYPES = [
  { value: "initial", label: "Initial Visit" },
  { value: "follow_up", label: "Follow-up Visit" },
  { value: "check_up", label: "Check-up" },
  { value: "consultation", label: "Consultation" },
  { value: "other", label: "Other" },
];

const NOTE_FORMATS = [
  { value: "soap", label: "SOAP" },
  { value: "summary", label: "Summary" },
  { value: "custom", label: "Custom" },
];

export default function NewSession() {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionType, setSessionType] = useState("");
  const [noteFormat, setNoteFormat] = useState("soap");
  const [buildFromPrevious, setBuildFromPrevious] = useState(false);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          New Session
        </h1>
        <p className="mt-1 text-muted-foreground">
          Record your patient encounter and generate clinical notes
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Recording Controls */}
        <div className="space-y-6">
          {/* Session Configuration */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-heading text-lg font-semibold text-slate-900">
              Session Details
            </h2>

            <div className="space-y-4">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label htmlFor="patient">Patient</Label>
                <Select
                  id="patient"
                  options={[]}
                  placeholder="Select a patient or add new"
                />
                <p className="text-xs text-muted-foreground">
                  <button type="button" className="text-primary hover:underline">
                    + Add new patient
                  </button>
                </p>
              </div>

              {/* Session Type */}
              <div className="space-y-2">
                <Label htmlFor="sessionType">Session Type</Label>
                <Select
                  id="sessionType"
                  options={SESSION_TYPES}
                  placeholder="Select session type"
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                />
              </div>

              {/* Build from Previous */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="buildFromPrevious"
                  checked={buildFromPrevious}
                  onCheckedChange={(checked: boolean) =>
                    setBuildFromPrevious(checked)
                  }
                />
                <label
                  htmlFor="buildFromPrevious"
                  className="text-sm font-medium leading-none"
                >
                  Build from previous session
                </label>
              </div>
            </div>
          </div>

          {/* Recording Area */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-heading text-lg font-semibold text-slate-900">
              Recording
            </h2>

            <div
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
                isRecording
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 bg-slate-50 hover:border-primary/50"
              }`}
            >
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                {isRecording ? (
                  <MicOff className="h-10 w-10" />
                ) : (
                  <Mic className="h-10 w-10" />
                )}
              </button>

              <p className="mt-4 text-center font-medium text-slate-900">
                {isRecording ? "Recording in progress..." : "Click to Start Recording"}
              </p>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                {isRecording
                  ? "Click again to stop and process"
                  : "Speak clearly and naturally. The AI will transcribe and analyze your session."}
              </p>

              {isRecording && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-600">00:00</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Note Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-900">
              Generated Note
            </h2>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {NOTE_FORMATS.map((format) => (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => setNoteFormat(format.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    noteFormat === format.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note Preview Content */}
          <div className="rounded-lg bg-slate-50 p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">No note generated yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start recording to generate your clinical note
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" disabled>
              Copy to Clipboard
            </Button>
            <Button variant="outline" className="flex-1" disabled>
              Export to PDF
            </Button>
            <Button className="flex-1" disabled>
              Send to EHR
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
