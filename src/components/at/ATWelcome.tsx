import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Users,
  Activity,
  FileText,
  AlertCircle,
  Mic,
  ArrowLeft,
} from "lucide-react";

export default function ATWelcome() {
  const stats = useQuery(api.organizations.getStats);
  const activeInjuries = useQuery(api.injuries.listActive, { limit: 5 });
  const recentEncounters = useQuery(api.encounters.listRecent, { limit: 5 });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Select an athlete from the roster</span>
        </div>
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Athletic Training Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Quick overview of your organization
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Athletes</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {stats?.athleteCount ?? "-"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Injuries</p>
              <p className="mt-1 text-2xl font-semibold text-amber-600">
                {activeInjuries?.length ?? "-"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Teams</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {stats?.teamCount ?? "-"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {recentEncounters?.filter(
                  (e) => new Date(e.encounterDatetime).toDateString() === new Date().toDateString()
                ).length ?? 0}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Injuries */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Activity className="h-5 w-5 text-amber-500" />
            <h2 className="font-heading font-semibold text-slate-900">Active Injuries</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {!activeInjuries || activeInjuries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-muted-foreground">No active injuries</p>
              </div>
            ) : (
              activeInjuries.map((injury) => (
                <div
                  key={injury._id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                      {injury.athleteName?.[0] || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{injury.athleteName}</p>
                      <p className="text-sm text-muted-foreground">
                        {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      injury.rtpStatus === "full"
                        ? "bg-green-100 text-green-700"
                        : injury.rtpStatus === "limited"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {injury.rtpStatus === "full" ? "Full" : injury.rtpStatus === "limited" ? "Limited" : "Out"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Encounters */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <FileText className="h-5 w-5 text-emerald-500" />
            <h2 className="font-heading font-semibold text-slate-900">Recent Encounters</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {!recentEncounters || recentEncounters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-muted-foreground">No recent encounters</p>
              </div>
            ) : (
              recentEncounters.map((encounter) => (
                <div
                  key={encounter._id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                      {encounter.athleteName?.[0] || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{encounter.athleteName}</p>
                      <p className="text-sm text-muted-foreground">
                        {encounter.encounterType?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(encounter.encounterDatetime).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ambient Notes Promo */}
      <div className="mt-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Ambient Notes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select an athlete, then use the New Encounter button to create voice-powered SOAP notes with AI assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
