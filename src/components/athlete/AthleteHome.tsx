import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Activity, Dumbbell, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AthleteHome() {
  const profile = useQuery(api.athletePortal.getMyProfile);
  const injuries = useQuery(api.athletePortal.getMyInjuries);
  const rehabPrograms = useQuery(api.athletePortal.getMyRehabPrograms);
  const recentEncounters = useQuery(api.athletePortal.getMyEncounters, { limit: 3 });

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const activeInjuries = injuries?.filter((i) => i.status === "active") || [];
  const activeRehabPrograms = rehabPrograms?.filter((p) => p.status === "active") || [];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "out":
        return "bg-red-100 text-red-800 border-red-200";
      case "limited":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "out":
        return "Out";
      case "limited":
        return "Limited";
      default:
        return "Healthy";
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {profile.preferredName || profile.firstName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {profile.teamName} • {profile.position || "Athlete"}
          {profile.jerseyNumber && ` • #${profile.jerseyNumber}`}
        </p>

        {/* Status Badge */}
        <div className="mt-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${getStatusColor(
              profile.availabilityStatus
            )}`}
          >
            {profile.availabilityStatus === "healthy" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            Current Status: {getStatusLabel(profile.availabilityStatus)}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{activeInjuries.length}</p>
              <p className="text-sm text-muted-foreground">Active Injuries</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{activeRehabPrograms.length}</p>
              <p className="text-sm text-muted-foreground">Active Rehab Programs</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{recentEncounters?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Recent Documents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Injuries Summary */}
      {activeInjuries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              Active Injuries
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {activeInjuries.map((injury) => (
              <div key={injury._id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                    </p>
                    {injury.diagnosis && (
                      <p className="text-sm text-slate-600">{injury.diagnosis}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Since {injury.injuryDate}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      injury.rtpStatus === "out"
                        ? "bg-red-100 text-red-700"
                        : injury.rtpStatus === "limited"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {injury.rtpStatus === "out"
                      ? "Out"
                      : injury.rtpStatus === "limited"
                        ? "Limited"
                        : "Full"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Rehab Programs Summary */}
      {activeRehabPrograms.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-purple-500" />
              Active Rehab Programs
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {activeRehabPrograms.map((program) => (
              <div key={program._id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{program.name}</p>
                    <p className="text-sm text-slate-600">
                      {program.injuryBodyRegion} • {program.exerciseCount} exercises
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started {program.startDate}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Documents */}
      {recentEncounters && recentEncounters.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Recent Documents
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentEncounters.map((enc) => (
              <div key={enc._id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatEncounterType(enc.encounterType)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {enc.injuryBodyRegion && `${enc.injuryBodyRegion} • `}
                      {enc.providerName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(enc.encounterDatetime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeInjuries.length === 0 && activeRehabPrograms.length === 0 && (!recentEncounters || recentEncounters.length === 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">All Clear!</h3>
          <p className="text-muted-foreground mt-1">
            No active injuries or rehab programs. Keep up the good work!
          </p>
        </div>
      )}
    </div>
  );
}
