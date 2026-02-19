import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useATContext } from "@/contexts/ATContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  ChevronDown,
  Dumbbell,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Id } from "../../../convex/_generated/dataModel";

interface Exercise {
  id: string;
  name: string;
  description: string;
  sets: string;
  reps: string;
  holdSeconds: string;
  durationMinutes: string;
  frequency: string;
  equipment: string;
  notes: string;
}

const createEmptyExercise = (): Exercise => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  sets: "",
  reps: "",
  holdSeconds: "",
  durationMinutes: "",
  frequency: "",
  equipment: "",
  notes: "",
});

export default function RehabProgramForm() {
  const { selectedAthleteId, setViewMode } = useATContext();

  const athlete = useQuery(
    api.athletes.getById,
    selectedAthleteId ? { athleteId: selectedAthleteId } : "skip"
  );

  const activeInjuries = useQuery(
    api.injuries.getByAthlete,
    selectedAthleteId ? { athleteId: selectedAthleteId, status: "active" } : "skip"
  );

  const createRehabProgram = useMutation(api.rehabPrograms.create);

  // Form state
  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [injuryId, setInjuryId] = useState<Id<"injuries"> | "">("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [programNotes, setProgramNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([createEmptyExercise()]);
  const [isSaving, setIsSaving] = useState(false);

  const handleBackToProfile = () => {
    setViewMode("profile");
  };

  const handleAddExercise = () => {
    setExercises([...exercises, createEmptyExercise()]);
  };

  const handleRemoveExercise = (id: string) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((e) => e.id !== id));
    }
  };

  const handleExerciseChange = (id: string, field: keyof Exercise, value: string) => {
    setExercises(
      exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAthleteId || !injuryId) {
      toast.error("Please select an injury for this program");
      return;
    }

    if (!programName.trim()) {
      toast.error("Please enter a program name");
      return;
    }

    // Filter out empty exercises
    const validExercises = exercises.filter((ex) => ex.name.trim());

    if (validExercises.length === 0) {
      toast.error("Please add at least one exercise");
      return;
    }

    setIsSaving(true);
    try {
      await createRehabProgram({
        athleteId: selectedAthleteId,
        injuryId: injuryId as Id<"injuries">,
        name: programName,
        description: programDescription || undefined,
        targetEndDate: targetEndDate || undefined,
        notes: programNotes || undefined,
        exercises: validExercises.map((ex) => ({
          name: ex.name,
          description: ex.description || undefined,
          sets: ex.sets ? parseInt(ex.sets) : undefined,
          reps: ex.reps || undefined,
          holdSeconds: ex.holdSeconds ? parseInt(ex.holdSeconds) : undefined,
          durationMinutes: ex.durationMinutes ? parseInt(ex.durationMinutes) : undefined,
          frequency: ex.frequency || undefined,
          equipment: ex.equipment || undefined,
          notes: ex.notes || undefined,
        })),
      });

      toast.success("Rehab program created successfully");
      setViewMode("profile");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create program";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
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
            <h1 className="text-xl font-semibold text-slate-900">
              New Rehab / Exercise Program
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Creating program for {athlete.firstName} {athlete.lastName}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <Dumbbell className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 max-w-4xl">
        {/* Program Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Program Details
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="programName">Program Name *</Label>
              <Input
                id="programName"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="e.g., ACL Rehab Phase 1, Ankle Strengthening"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="injuryId">Linked Injury *</Label>
              <div className="relative mt-1">
                <select
                  id="injuryId"
                  value={injuryId}
                  onChange={(e) => setInjuryId(e.target.value as Id<"injuries"> | "")}
                  className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select an injury...</option>
                  {activeInjuries?.map((injury) => (
                    <option key={injury._id} value={injury._id}>
                      {injury.bodyRegion} {injury.side !== "NA" && `(${injury.side})`}
                      {injury.diagnosis && ` - ${injury.diagnosis}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              {activeInjuries?.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No active injuries. Create an initial evaluation first to document an injury.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="programDescription">Description</Label>
              <Input
                id="programDescription"
                value={programDescription}
                onChange={(e) => setProgramDescription(e.target.value)}
                placeholder="Brief description of the program goals"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="targetEndDate">Target End Date</Label>
              <Input
                id="targetEndDate"
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="programNotes">Notes</Label>
              <Input
                id="programNotes"
                value={programNotes}
                onChange={(e) => setProgramNotes(e.target.value)}
                placeholder="Any additional notes"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-6">
          <div className="border-b border-slate-200 px-5 py-4 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-purple-500" />
              <h2 className="font-semibold text-slate-900">Exercises</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddExercise}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Exercise
            </Button>
          </div>

          <div className="divide-y divide-slate-100">
            {exercises.map((exercise, index) => (
              <div key={exercise.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 pt-2 text-slate-400">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label>Exercise Name *</Label>
                        <Input
                          value={exercise.name}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "name", e.target.value)
                          }
                          placeholder="e.g., Quad Sets, Heel Slides, SLR"
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Description / Instructions</Label>
                        <Input
                          value={exercise.description}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "description", e.target.value)
                          }
                          placeholder="How to perform the exercise"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Sets</Label>
                        <Input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "sets", e.target.value)
                          }
                          placeholder="3"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Reps</Label>
                        <Input
                          value={exercise.reps}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "reps", e.target.value)
                          }
                          placeholder="10-15 or 10"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Hold (seconds)</Label>
                        <Input
                          type="number"
                          value={exercise.holdSeconds}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "holdSeconds", e.target.value)
                          }
                          placeholder="For isometric exercises"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={exercise.durationMinutes}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "durationMinutes", e.target.value)
                          }
                          placeholder="For timed exercises"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Frequency</Label>
                        <Input
                          value={exercise.frequency}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "frequency", e.target.value)
                          }
                          placeholder="e.g., 2x daily, 3x per week"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Equipment</Label>
                        <Input
                          value={exercise.equipment}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "equipment", e.target.value)
                          }
                          placeholder="e.g., Theraband, Foam roller"
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Notes</Label>
                        <Input
                          value={exercise.notes}
                          onChange={(e) =>
                            handleExerciseChange(exercise.id, "notes", e.target.value)
                          }
                          placeholder="Specific notes for this exercise"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveExercise(exercise.id)}
                    disabled={exercises.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-3 mb-6">
          <p className="text-sm text-purple-700">
            <strong>Note:</strong> This program will be visible to the athlete in their portal.
            They can view the exercises, sets, reps, and any instructions you provide.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={handleBackToProfile}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !injuryId || !programName.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Program
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
