import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  FileText,
  Activity,
  Users,
  ChevronRight,
  Plus,
  CheckCircle,
  Bell,
} from "lucide-react";
import MyEncounters from "./MyEncounters";

type MyDashboardView = "dashboard" | "my-encounters";

export default function MyDashboard() {
  const [currentView, setCurrentView] = useState<MyDashboardView>("dashboard");
  const { setCurrentPage, setSelectedTeamId, setSelectedAthleteId, setViewMode } = useATContext();

  const currentUser = useQuery(api.users.getCurrent);
  const recentEncounters = useQuery(api.encounters.listRecent, { limit: 10 });
  const activeInjuries = useQuery(api.injuries.listActive, { limit: 10 });
  const teams = useQuery(api.teams.list, {});

  // Filter encounters created by current user
  const myRecentEncounters = recentEncounters?.filter(
    (e) => e.providerName === currentUser?.fullName
  ).slice(0, 5);

  const todayEncounters = recentEncounters?.filter(
    (e) => new Date(e.encounterDatetime).toDateString() === new Date().toDateString()
  );

  const myTodayEncounters = todayEncounters?.filter(
    (e) => e.providerName === currentUser?.fullName
  );

  const handleGoToEMR = (athleteId?: Id<"athletes">) => {
    if (athleteId) {
      setSelectedAthleteId(athleteId);
    }
    setCurrentPage("emr");
  };

  const handleGoToTeam = (teamId: Id<"teams">) => {
    setSelectedTeamId(teamId);
    setCurrentPage("team-overview");
  };

  const handleNewDocument = () => {
    setSelectedAthleteId(null);
    setViewMode("start-document");
    setCurrentPage("emr");
  };

  // Show MyEncounters view if selected
  if (currentView === "my-encounters") {
    return <MyEncounters onBack={() => setCurrentView("dashboard")} />;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">
          Welcome back, {currentUser?.fullName?.split(" ")[0] || "Trainer"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's your overview for {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Quick Stats - 3 columns now */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Encounters</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {myTodayEncounters?.length ?? 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <FileText className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {todayEncounters?.length ?? 0} total across org
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Injuries</p>
              <p className="mt-1 text-3xl font-semibold text-amber-600">
                {activeInjuries?.length ?? 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Activity className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {activeInjuries?.filter((i) => i.rtpStatus === "out").length ?? 0} athletes out
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">This Week</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {recentEncounters?.length ?? 0}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Encounters documented
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Schedule & Tasks */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <h2 className="font-heading font-semibold text-slate-900">Today's Schedule</h2>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Clock className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-muted-foreground">Schedule feature coming soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll be able to manage appointments and follow-ups here
                </p>
              </div>
            </div>
          </div>

          {/* Tasks / Follow-ups */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <h2 className="font-heading font-semibold text-slate-900">Tasks</h2>
              </div>
              <span className="text-xs text-muted-foreground">Coming soon</span>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-3">
                  <Bell className="h-5 w-5 text-slate-400" />
                  <div className="text-sm text-muted-foreground">
                    Follow-up reminders and tasks will appear here
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - My Recent Activity */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-500" />
                <h2 className="font-heading font-semibold text-slate-900">My Recent Encounters</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("my-encounters")}
              >
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="divide-y divide-slate-100">
              {!myRecentEncounters || myRecentEncounters.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <FileText className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-600">No encounters yet today</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your documented encounters will appear here
                  </p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={handleNewDocument}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    New Document
                  </Button>
                </div>
              ) : (
                <>
                  {myRecentEncounters.map((encounter) => (
                    <button
                      key={encounter._id}
                      onClick={() => handleGoToEMR(encounter.athleteId)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
                          {encounter.athleteName?.[0] || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{encounter.athleteName}</p>
                          <p className="text-xs text-muted-foreground">
                            {encounter.encounterType.replace(/_/g, " ")} • {encounter.teamName}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(encounter.encounterDatetime).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                  <div className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleNewDocument}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      New Document
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Teams & Injuries */}
        <div className="space-y-6">
          {/* My Teams */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <h2 className="font-heading font-semibold text-slate-900">My Teams</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {!teams || teams.length === 0 ? (
                <div className="p-5 text-center">
                  <p className="text-sm text-muted-foreground">No teams assigned</p>
                </div>
              ) : (
                teams.slice(0, 4).map((team) => (
                  <button
                    key={team._id}
                    onClick={() => handleGoToTeam(team._id)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-sm font-medium text-blue-700">
                        {team.name[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-slate-900">{team.name}</p>
                        <p className="text-xs text-muted-foreground">{team.sport}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Athletes Needing Attention */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-amber-500" />
                <h2 className="font-heading font-semibold text-slate-900">Needs Attention</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {!activeInjuries || activeInjuries.filter((i) => i.rtpStatus === "out").length === 0 ? (
                <div className="p-5 text-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All athletes cleared!</p>
                </div>
              ) : (
                activeInjuries
                  .filter((i) => i.rtpStatus === "out")
                  .slice(0, 4)
                  .map((injury) => (
                    <button
                      key={injury._id}
                      onClick={() => handleGoToEMR(injury.athleteId)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-sm font-medium text-red-700">
                          {injury.athleteName[0]}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-slate-900">{injury.athleteName}</p>
                          <p className="text-xs text-muted-foreground">
                            {injury.bodyRegion} • {injury.daysSinceInjury} days
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                        Out
                      </span>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
