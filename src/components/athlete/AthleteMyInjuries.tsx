import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Activity, CheckCircle2, AlertCircle } from "lucide-react";

export default function AthleteMyInjuries() {
  const injuries = useQuery(api.athletePortal.getMyInjuries);

  if (injuries === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading injuries...</p>
      </div>
    );
  }

  const activeInjuries = injuries.filter((i) => i.status === "active");
  const resolvedInjuries = injuries.filter((i) => i.status === "resolved");

  const formatBodyRegion = (region: string) => {
    return region
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Injuries</h1>
        <p className="text-muted-foreground mt-1">
          View your current and past injuries
        </p>
      </div>

      {/* Active Injuries */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500" />
            Active Injuries
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {activeInjuries.length}
            </span>
          </h2>
        </div>

        {activeInjuries.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No active injuries</p>
            <p className="text-sm text-muted-foreground mt-1">
              You're currently injury-free!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeInjuries.map((injury) => (
              <div key={injury._id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          injury.rtpStatus === "out"
                            ? "bg-red-100 text-red-600"
                            : injury.rtpStatus === "limited"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-green-100 text-green-600"
                        }`}
                      >
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {formatBodyRegion(injury.bodyRegion)}
                          {injury.side !== "NA" && ` (${injury.side})`}
                        </p>
                        {injury.diagnosis && (
                          <p className="text-sm text-slate-600">{injury.diagnosis}</p>
                        )}
                      </div>
                    </div>

                    {injury.mechanism && (
                      <div className="mt-3 ml-13">
                        <p className="text-xs text-muted-foreground">How it happened:</p>
                        <p className="text-sm text-slate-600">{injury.mechanism}</p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Injured: {injury.injuryDate}</span>
                      <span>•</span>
                      <span>{injury.encounterCount} encounters</span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                      injury.rtpStatus === "out"
                        ? "bg-red-100 text-red-700"
                        : injury.rtpStatus === "limited"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {injury.rtpStatus === "out" && <AlertCircle className="h-3.5 w-3.5" />}
                    {injury.rtpStatus === "out"
                      ? "Out"
                      : injury.rtpStatus === "limited"
                        ? "Limited"
                        : "Full Participation"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Injury History */}
      {resolvedInjuries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Injury History
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {resolvedInjuries.length}
              </span>
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {resolvedInjuries.map((injury) => (
              <div key={injury._id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {formatBodyRegion(injury.bodyRegion)}
                          {injury.side !== "NA" && ` (${injury.side})`}
                        </p>
                        {injury.diagnosis && (
                          <p className="text-sm text-slate-600">{injury.diagnosis}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{injury.injuryDate} - {injury.resolvedDate || "Resolved"}</span>
                      <span>•</span>
                      <span>{injury.encounterCount} encounters</span>
                    </div>
                  </div>

                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    Resolved
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Injuries At All */}
      {injuries.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Injury History</h3>
          <p className="text-muted-foreground mt-1">
            You have no recorded injuries. Stay healthy!
          </p>
        </div>
      )}
    </div>
  );
}
