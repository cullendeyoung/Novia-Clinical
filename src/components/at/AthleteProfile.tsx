import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Ruler,
  Weight,
  AlertCircle,
  Activity,
  FileText,
  Heart,
  Shield,
  Plus,
  Clock,
} from "lucide-react";

export default function AthleteProfile() {
  const { selectedAthleteId, setViewMode, setSelectedEncounterId } = useATContext();

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
          <Button onClick={handleNewEncounter}>
            <Plus className="mr-2 h-4 w-4" />
            New Encounter
          </Button>
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
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {athlete.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{athlete.email}</span>
                </div>
              )}
              {athlete.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(athlete.dateOfBirth).toLocaleDateString()}
                    {athlete.sex && ` • ${athlete.sex === "M" ? "Male" : athlete.sex === "F" ? "Female" : "Other"}`}
                  </span>
                </div>
              )}
              {athlete.heightInches && (
                <div className="flex items-center gap-3">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatHeight(athlete.heightInches)}</span>
                </div>
              )}
              {athlete.weightLbs && (
                <div className="flex items-center gap-3">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{athlete.weightLbs} lbs</span>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {athlete.emergencyContactName && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Emergency Contact
                </h2>
              </div>
              <div className="p-5">
                <p className="font-medium text-slate-900">{athlete.emergencyContactName}</p>
                {athlete.emergencyContactPhone && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {athlete.emergencyContactPhone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
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

        {/* Middle Column - Injuries */}
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
                  <div key={injury._id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                        </p>
                        {injury.diagnosis && (
                          <p className="text-sm text-slate-600 mt-0.5">{injury.diagnosis}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Injured: {injury.injuryDate} • {injury.encounterCount} encounters
                        </p>
                      </div>
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

        {/* Right Column - Recent Encounters */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                Recent Encounters
              </h2>
              <span className="text-sm text-muted-foreground">{encounters?.length ?? 0}</span>
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

          {/* Medical History Summary */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Medical Summary
              </h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div>
                <p className="font-medium text-slate-700">Total Injuries</p>
                <p className="text-muted-foreground">{injuries?.length ?? 0} on record</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Total Encounters</p>
                <p className="text-muted-foreground">{encounters?.length ?? 0} documented</p>
              </div>
              {athlete.profileCompletedAt && (
                <div>
                  <p className="font-medium text-slate-700">Profile Completed</p>
                  <p className="text-muted-foreground">
                    {new Date(athlete.profileCompletedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
