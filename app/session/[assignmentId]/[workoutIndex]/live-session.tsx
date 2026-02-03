"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { saveSession } from "@/lib/actions/sessions";

type ExerciseTarget = {
  name: string;
  type: string;
  category: string;
  sets: number;
  reps: number;
  weight: number;
  duration: number;
  distance: number;
  rest: number;
  notes: string | null;
};

type ActualSet = {
  reps: number;
  weight: number;
  duration: number;
  distance: number;
};

type ExerciseState = {
  actualSets: ActualSet[];
  notes: string;
};

export function LiveSession({
  assignmentId,
  workoutIndex,
  clientName,
  clientHealth,
  workoutName,
  exercises,
}: {
  assignmentId: string;
  workoutIndex: number;
  clientName: string;
  clientHealth: string | null;
  workoutName: string;
  exercises: ExerciseTarget[];
}) {
  const router = useRouter();
  const [currentExercise, setCurrentExercise] = useState(0);
  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>(
    exercises.map(() => ({ actualSets: [], notes: "" }))
  );
  const [sessionNotes, setSessionNotes] = useState("");
  const [startTime] = useState(Date.now());
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const ex = exercises[currentExercise];
  const exState = exerciseStates[currentExercise];

  useEffect(() => {
    if (isResting && restTimer > 0) {
      timerRef.current = setTimeout(() => setRestTimer((r) => r - 1), 1000);
    } else if (restTimer === 0 && isResting) {
      setIsResting(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [restTimer, isResting]);

  const updateExerciseState = (
    index: number,
    updates: Partial<ExerciseState>
  ) => {
    setExerciseStates((states) =>
      states.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const addSet = () => {
    const lastSet =
      exState.actualSets.length > 0
        ? exState.actualSets[exState.actualSets.length - 1]
        : null;

    const newSet: ActualSet =
      ex.type === "weight"
        ? {
            reps: ex.reps,
            weight: lastSet?.weight || ex.weight,
            duration: 0,
            distance: 0,
          }
        : {
            reps: 0,
            weight: 0,
            duration: ex.duration,
            distance: ex.distance,
          };

    updateExerciseState(currentExercise, {
      actualSets: [...exState.actualSets, newSet],
    });
  };

  const updateSet = (setIdx: number, updates: Partial<ActualSet>) => {
    const newSets = exState.actualSets.map((s, i) =>
      i === setIdx ? { ...s, ...updates } : s
    );
    updateExerciseState(currentExercise, { actualSets: newSets });
  };

  const removeSet = (setIdx: number) => {
    updateExerciseState(currentExercise, {
      actualSets: exState.actualSets.filter((_, i) => i !== setIdx),
    });
  };

  const startRest = (seconds: number) => {
    setRestTimer(seconds);
    setIsResting(true);
  };

  const stopRest = () => {
    setRestTimer(0);
    setIsResting(false);
  };

  const nextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
      setIsResting(false);
      setRestTimer(0);
    }
  };

  const prevExercise = () => {
    if (currentExercise > 0) {
      setCurrentExercise(currentExercise - 1);
      setIsResting(false);
      setRestTimer(0);
    }
  };

  const finishSession = async () => {
    setSaving(true);
    try {
      const sessionExercises = exerciseStates
        .map((state, idx) => {
          if (state.actualSets.length === 0 && !state.notes) return null;

          const target = exercises[idx];
          const maxWeight = Math.max(
            ...state.actualSets.map((s) => s.weight || 0),
            0
          );
          const totalDuration = state.actualSets.reduce(
            (sum, s) => sum + (s.duration || 0),
            0
          );
          const totalDistance = state.actualSets.reduce(
            (sum, s) => sum + (s.distance || 0),
            0
          );

          return {
            exerciseIndex: idx,
            sets: state.actualSets.length,
            reps: state.actualSets[0]?.reps || 0,
            weight: maxWeight,
            duration: totalDuration,
            distance: totalDistance,
            notes: state.notes || undefined,
            setDetails: state.actualSets.map((s, setIdx) => ({
              setNumber: setIdx + 1,
              reps: s.reps || undefined,
              weight: s.weight || undefined,
              duration: s.duration || undefined,
              distance: s.distance || undefined,
            })),
          };
        })
        .filter(Boolean) as Parameters<typeof saveSession>[0]["exercises"];

      await saveSession({
        assignmentId,
        workoutIndex,
        sessionNotes: sessionNotes || undefined,
        duration: Math.round((Date.now() - startTime) / 60000),
        date: new Date(),
        exercises: sessionExercises,
      });

      router.push(`/clients`);
    } catch (error) {
      console.error("Failed to save session:", error);
    } finally {
      setSaving(false);
    }
  };

  const elapsed = Math.floor((Date.now() - startTime) / 60000);

  return (
    <div className="min-h-screen -m-4 bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-teal-700 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">Live Session</p>
            <h1 className="text-xl font-bold text-white">{clientName}</h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono text-white">{elapsed}m</p>
            <p className="text-xs opacity-80">{workoutName}</p>
          </div>
        </div>
      </header>

      {/* Health Warning */}
      {clientHealth && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 p-3 flex gap-2">
          <AlertTriangle className="text-yellow-500 shrink-0" size={18} />
          <p className="text-sm">{clientHealth}</p>
        </div>
      )}

      <div className="p-4">
        {/* Exercise Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={prevExercise}
            disabled={currentExercise === 0}
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Exercise {currentExercise + 1} of {exercises.length}
            </p>
            <h2 className="text-xl font-bold">{ex.name}</h2>
            {ex.type === "weight" && (
              <p className="text-sm text-muted-foreground">
                Target: {ex.sets} sets × {ex.reps} reps @ {ex.weight} lbs
              </p>
            )}
            {ex.type === "cardio" && (
              <p className="text-sm text-muted-foreground">
                Target: {ex.duration} min · {ex.distance} mi
              </p>
            )}
            {ex.type === "timed" && (
              <p className="text-sm text-muted-foreground">
                Target: {ex.duration} min
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={nextExercise}
            disabled={currentExercise === exercises.length - 1}
          >
            <ChevronRight size={20} />
          </Button>
        </div>

        {/* Rest Timer */}
        {isResting && (
          <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4 mb-4 text-center">
            <p className="text-sm text-blue-400 mb-1">Rest Timer</p>
            <p className="text-4xl font-mono font-bold">
              {Math.floor(restTimer / 60)}:
              {String(restTimer % 60).padStart(2, "0")}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={stopRest}
            >
              Skip
            </Button>
          </div>
        )}

        {/* Sets */}
        <div className="bg-card rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Sets Completed</h3>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-500"
              onClick={addSet}
            >
              <Plus size={16} className="mr-1" /> Add Set
            </Button>
          </div>

          {exState.actualSets.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Tap "Add Set" after each set
            </p>
          ) : (
            <div className="space-y-2">
              {exState.actualSets.map((set, i) => (
                <div
                  key={i}
                  className="bg-muted rounded p-3 flex items-center gap-3"
                >
                  <span className="text-sm text-muted-foreground w-8">
                    #{i + 1}
                  </span>
                  {ex.type === "weight" ? (
                    <>
                      <div className="flex-1">
                        <Label className="text-xs">Reps</Label>
                        <Input
                          type="number"
                          className="text-lg"
                          value={set.reps}
                          onChange={(e) =>
                            updateSet(i, { reps: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Weight</Label>
                        <Input
                          type="number"
                          className="text-lg"
                          value={set.weight}
                          onChange={(e) =>
                            updateSet(i, {
                              weight: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1">
                      <Label className="text-xs">Duration</Label>
                      <Input
                        type="number"
                        className="text-lg"
                        value={set.duration}
                        onChange={(e) =>
                          updateSet(i, {
                            duration: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeSet(i)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Rest Timer Buttons */}
          {exState.actualSets.length > 0 && ex.type === "weight" && (
            <div className="flex gap-2 mt-3">
              {[60, 90, 120, 180].map((s) => (
                <Button
                  key={s}
                  variant="secondary"
                  className="flex-1"
                  onClick={() => startRest(s)}
                >
                  <Clock size={14} className="mr-1" />
                  {s >= 60
                    ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
                    : `${s}s`}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Exercise Notes */}
        <div className="bg-card rounded-lg p-4 mb-4">
          <Label className="flex items-center gap-1 mb-2">
            <MessageSquare size={14} /> Exercise Notes
          </Label>
          <Textarea
            rows={2}
            placeholder="Form cues, modifications..."
            value={exState.notes}
            onChange={(e) =>
              updateExerciseState(currentExercise, { notes: e.target.value })
            }
          />
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 mb-4">
          {exerciseStates.map((state, i) => (
            <button
              key={i}
              onClick={() => setCurrentExercise(i)}
              className={cn(
                "flex-1 h-2 rounded transition",
                i === currentExercise
                  ? "bg-green-500"
                  : state.actualSets.length > 0
                  ? "bg-green-700"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Session Notes */}
        <div className="bg-card rounded-lg p-4 mb-4">
          <Label className="flex items-center gap-1 mb-2">
            <MessageSquare size={14} /> Session Notes
          </Label>
          <Textarea
            rows={3}
            placeholder="Overall session notes..."
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-500"
            onClick={finishSession}
            disabled={saving}
          >
            <Check size={18} className="mr-2" />
            {saving ? "Saving..." : "Finish"}
          </Button>
        </div>
      </div>
    </div>
  );
}
