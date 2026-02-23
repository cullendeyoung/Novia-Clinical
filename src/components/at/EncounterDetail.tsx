import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  User,
  Activity,
  ArrowLeft,
  Edit,
  CheckCircle,
  Mic,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";

export default function EncounterDetail() {
  const { selectedEncounterId, setViewMode, setSelectedEncounterId } = useATContext();

  const encounter = useQuery(
    api.encounters.getById,
    selectedEncounterId ? { encounterId: selectedEncounterId } : "skip"
  );

  if (!encounter) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-muted-foreground">Loading encounter...</p>
      </div>
    );
  }

  const formatEncounterType = (type: string) => {
    const typeMap: Record<string, string> = {
      daily_care: "Daily Care / Treatment",
      soap_followup: "SOAP Follow-Up",
      initial_eval: "Initial Evaluation",
      rtp_clearance: "Return-to-Play Clearance",
      other: "Other",
    };
    return typeMap[type] || type;
  };

  const handleBackToProfile = () => {
    setSelectedEncounterId(null);
    setViewMode("profile");
  };

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
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                encounter.encounterType === "initial_eval"
                  ? "bg-blue-100 text-blue-600"
                  : encounter.encounterType === "rtp_clearance"
                    ? "bg-green-100 text-green-600"
                    : encounter.encounterType === "daily_care"
                      ? "bg-purple-100 text-purple-600"
                      : "bg-slate-100 text-slate-600"
              }`}>
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {formatEncounterType(encounter.encounterType)}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {encounter.athleteName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(encounter.encounterDatetime).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {encounter.aiGenerated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Mic className="h-4 w-4" />
                AI Generated
              </span>
            )}
            {encounter.signedOffByUserId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                <CheckCircle className="h-4 w-4" />
                Signed by {encounter.signedOffByName}
              </span>
            ) : (
              <Button variant="outline" size="sm">
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
            )}
            <Button
              onClick={() => toast.success("Upload to EMR coming soon!")}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload to EMR
            </Button>
          </div>
        </div>

        {/* Injury Reference */}
        {encounter.injuryId && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2">
            <div className="flex items-center gap-2 text-amber-700">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">
                Related to: {encounter.injuryBodyRegion}
                {encounter.injurySide !== "NA" && ` (${encounter.injurySide})`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl">
        {/* Provider Info */}
        <div className="mb-6 text-sm text-muted-foreground">
          Documented by <span className="font-medium text-slate-700">{encounter.providerName}</span>
        </div>

        {/* SOAP Note Content */}
        <div className="space-y-6">
          {/* Subjective */}
          {encounter.subjectiveText && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3 bg-blue-50">
                <h2 className="font-semibold text-blue-900">Subjective</h2>
                <p className="text-xs text-blue-600 mt-0.5">Patient's description and history</p>
              </div>
              <div className="p-5">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {encounter.subjectiveText}
                </p>
              </div>
            </div>
          )}

          {/* Objective */}
          {encounter.objectiveText && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3 bg-green-50">
                <h2 className="font-semibold text-green-900">Objective</h2>
                <p className="text-xs text-green-600 mt-0.5">Clinical findings and measurements</p>
              </div>
              <div className="p-5">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {encounter.objectiveText}
                </p>
              </div>
            </div>
          )}

          {/* Assessment */}
          {encounter.assessmentText && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3 bg-amber-50">
                <h2 className="font-semibold text-amber-900">Assessment</h2>
                <p className="text-xs text-amber-600 mt-0.5">Clinical impression and diagnosis</p>
              </div>
              <div className="p-5">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {encounter.assessmentText}
                </p>
              </div>
            </div>
          )}

          {/* Plan */}
          {encounter.planText && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3 bg-purple-50">
                <h2 className="font-semibold text-purple-900">Plan</h2>
                <p className="text-xs text-purple-600 mt-0.5">Treatment plan and follow-up</p>
              </div>
              <div className="p-5">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {encounter.planText}
                </p>
              </div>
            </div>
          )}

          {/* Full Note (if no SOAP sections) */}
          {encounter.fullNoteText && !encounter.subjectiveText && !encounter.objectiveText && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="font-semibold text-slate-900">Clinical Note</h2>
              </div>
              <div className="p-5">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {encounter.fullNoteText}
                </p>
              </div>
            </div>
          )}

          {/* Transcript (if AI generated) */}
          {encounter.transcriptText && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3 bg-slate-50">
                <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Original Transcript
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Voice recording transcription</p>
              </div>
              <div className="p-5">
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm italic">
                  {encounter.transcriptText}
                </p>
              </div>
            </div>
          )}

          {/* No Content */}
          {!encounter.subjectiveText &&
            !encounter.objectiveText &&
            !encounter.assessmentText &&
            !encounter.planText &&
            !encounter.fullNoteText && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-muted-foreground">No clinical notes recorded for this encounter</p>
                <Button className="mt-4" variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Add Notes
                </Button>
              </div>
            )}
        </div>

        {/* Upload to EMR Button */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <Button
            onClick={() => toast.success("Document is saved to the EMR")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-base"
          >
            <Upload className="mr-2 h-5 w-5" />
            Upload to EMR
          </Button>
        </div>

        {/* Footer Metadata */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Created: {new Date(encounter.createdAt).toLocaleString()}
            </div>
            {encounter.updatedAt !== encounter.createdAt && (
              <div>
                Last updated: {new Date(encounter.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
