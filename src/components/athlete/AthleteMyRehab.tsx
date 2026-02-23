import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Dumbbell, ChevronDown, ChevronRight, Clock, Target } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export default function AthleteMyRehab() {
  const programs = useQuery(api.athletePortal.getMyRehabPrograms);
  const [expandedProgramId, setExpandedProgramId] = useState<Id<"rehabPrograms"> | null>(null);

  // Fetch program details when expanded
  const programDetail = useQuery(
    api.athletePortal.getMyRehabProgramById,
    expandedProgramId ? { programId: expandedProgramId } : "skip"
  );

  if (programs === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading rehab programs...</p>
      </div>
    );
  }

  const activePrograms = programs.filter((p) => p.status === "active");
  const completedPrograms = programs.filter((p) => p.status === "completed");
  const otherPrograms = programs.filter((p) => p.status !== "active" && p.status !== "completed");

  const formatBodyRegion = (region: string) => {
    if (region === "Prehab") return region;
    return region
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-purple-100 text-purple-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const toggleProgram = (programId: Id<"rehabPrograms">) => {
    setExpandedProgramId(expandedProgramId === programId ? null : programId);
  };

  const renderProgramCard = (program: typeof programs[0]) => {
    const isExpanded = expandedProgramId === program._id;

    return (
      <div key={program._id} className="border-b border-slate-100 last:border-b-0">
        <button
          onClick={() => toggleProgram(program._id)}
          className="w-full p-5 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  program.status === "active"
                    ? "bg-purple-100 text-purple-600"
                    : program.status === "completed"
                      ? "bg-green-100 text-green-600"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                <Dumbbell className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{program.name}</p>
                <p className="text-sm text-slate-600">
                  {formatBodyRegion(program.injuryBodyRegion)}
                  {program.injurySide !== "NA" && ` (${program.injurySide})`}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Started {program.startDate}
                  </span>
                  {program.targetEndDate && (
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Target: {program.targetEndDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {program.exerciseCount} exercises
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(program.status)}`}>
                {program.status}
              </span>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-slate-400" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded Exercise Details */}
        {isExpanded && (
          <div className="px-5 pb-5">
            <div className="bg-slate-50 rounded-lg p-4">
              {program.description && (
                <p className="text-sm text-slate-600 mb-4">{program.description}</p>
              )}

              {!programDetail ? (
                <p className="text-sm text-muted-foreground">Loading exercises...</p>
              ) : programDetail.exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exercises in this program yet.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Exercises
                  </p>
                  {programDetail.exercises.map((exercise, index) => (
                    <div
                      key={exercise._id}
                      className="bg-white rounded-lg p-4 border border-slate-200"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {index + 1}. {exercise.name}
                          </p>
                          {exercise.description && (
                            <p className="text-sm text-slate-600 mt-1">{exercise.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-3 text-xs">
                        {exercise.sets && (
                          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-slate-700">
                            {exercise.sets} sets
                          </span>
                        )}
                        {exercise.reps && (
                          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-slate-700">
                            {exercise.reps} reps
                          </span>
                        )}
                        {exercise.durationMinutes && (
                          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-slate-700">
                            {exercise.durationMinutes} min
                          </span>
                        )}
                        {exercise.frequency && (
                          <span className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-blue-700">
                            {exercise.frequency}
                          </span>
                        )}
                      </div>

                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Note: {exercise.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Rehab Programs</h1>
        <p className="text-muted-foreground mt-1">
          View your rehabilitation exercises and progress
        </p>
      </div>

      {/* Active Programs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-purple-500" />
            Active Programs
            <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
              {activePrograms.length}
            </span>
          </h2>
        </div>

        {activePrograms.length === 0 ? (
          <div className="p-8 text-center">
            <Dumbbell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No active programs</p>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have any active rehab programs right now.
            </p>
          </div>
        ) : (
          <div>{activePrograms.map(renderProgramCard)}</div>
        )}
      </div>

      {/* Completed Programs */}
      {completedPrograms.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              Completed Programs
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                {completedPrograms.length}
              </span>
            </h2>
          </div>
          <div>{completedPrograms.map(renderProgramCard)}</div>
        </div>
      )}

      {/* Other Programs (Paused/Discontinued) */}
      {otherPrograms.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              Other Programs
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {otherPrograms.length}
              </span>
            </h2>
          </div>
          <div>{otherPrograms.map(renderProgramCard)}</div>
        </div>
      )}

      {/* No Programs */}
      {programs.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Dumbbell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No Rehab Programs</h3>
          <p className="text-muted-foreground mt-1">
            You don't have any rehab programs assigned yet.
          </p>
        </div>
      )}
    </div>
  );
}
