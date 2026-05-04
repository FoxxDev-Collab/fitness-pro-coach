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
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { saveSession } from "@/lib/actions/sessions";
import type { ExerciseHistoryEntry } from "@/lib/actions/sessions";
import { History } from "lucide-react";
import { BodyMap } from "@/components/body-map";

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
  muscles?: string[];
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
  previousData,
}: {
  assignmentId: string;
  workoutIndex: number;
  clientName: string;
  clientHealth: string | null;
  workoutName: string;
  exercises: ExerciseTarget[];
  previousData?: ExerciseHistoryEntry[];
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
    setExerciseStates((states: ExerciseState[]) =>
      states.map((s: ExerciseState, i: number) => (i === index ? { ...s, ...updates } : s))
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
    const newSets = exState.actualSets.map((s: ActualSet, i: number) =>
      i === setIdx ? { ...s, ...updates } : s
    );
    updateExerciseState(currentExercise, { actualSets: newSets });
  };

  const removeSet = (setIdx: number) => {
    updateExerciseState(currentExercise, {
      actualSets: exState.actualSets.filter((_: ActualSet, i: number) => i !== setIdx),
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
        .map((state: ExerciseState, idx: number) => {
          if (state.actualSets.length === 0 && !state.notes) return null;

          const maxWeight = Math.max(
            ...state.actualSets.map((s: ActualSet) => s.weight || 0),
            0
          );
          const totalDuration = state.actualSets.reduce(
            (sum: number, s: ActualSet) => sum + (s.duration || 0),
            0
          );
          const totalDistance = state.actualSets.reduce(
            (sum: number, s: ActualSet) => sum + (s.distance || 0),
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
            setDetails: state.actualSets.map((s: ActualSet, setIdx: number) => ({
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
    <div className="min-h-dvh -mx-4 -mt-6 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 h-14">
          <div>
            <p className="text-xs text-muted-foreground">Live Session</p>
            <p className="font-semibold">{clientName}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono tabular-nums font-semibold">{elapsed}m</p>
            <p className="text-xs text-muted-foreground">{workoutName}</p>
          </div>
        </div>
      </div>

      {/* Health Warning */}
      {clientHealth && (
        <div className="border-b border-warning/50 bg-warning/10 px-4 py-3 flex gap-2.5">
          <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
          <p className="text-sm">{clientHealth}</p>
        </div>
      )}

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Exercise Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={prevExercise}
            disabled={currentExercise === 0}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Exercise {currentExercise + 1} of {exercises.length}
            </p>
            <h2 className="text-lg font-semibold">{ex.name}</h2>
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
            {/* Previous Performance */}
            {previousData?.[currentExercise]?.lastSession && (() => {
              const prev = previousData[currentExercise].lastSession!;
              const dateStr = new Date(prev.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              if (ex.type === "weight") {
                const maxWeight = Math.max(...prev.sets.map((s) => s.weight));
                const totalSets = prev.sets.length;
                const reps = prev.sets[0]?.reps ?? 0;
                return (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <History className="size-3" />
                    Last: {totalSets}×{reps} @ {maxWeight} lbs ({dateStr})
                  </p>
                );
              }
              if (ex.type === "cardio") {
                const totalDuration = prev.sets.reduce((sum, s) => sum + s.duration, 0);
                const totalDistance = prev.sets.reduce((sum, s) => sum + s.distance, 0);
                return (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <History className="size-3" />
                    Last: {totalDuration} min · {totalDistance} mi ({dateStr})
                  </p>
                );
              }
              const totalDuration = prev.sets.reduce((sum, s) => sum + s.duration, 0);
              return (
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <History className="size-3" />
                  Last: {totalDuration} min ({dateStr})
                </p>
              );
            })()}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={nextExercise}
            disabled={currentExercise === exercises.length - 1}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Muscle Map */}
        {ex.muscles && ex.muscles.length > 0 && (
          <div className="flex items-center justify-center gap-3">
            <BodyMap activeMuscles={ex.muscles} size="sm" />
            <div className="flex flex-wrap gap-1">
              {ex.muscles.map((m) => (
                <span key={m} className="bg-primary/15 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rest Timer */}
        {isResting && (
          <Card className="border-2">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Timer className="size-3" /> Rest Timer
              </p>
              <p className="text-4xl font-mono font-bold tabular-nums">
                {Math.floor(restTimer / 60)}:
                {String(restTimer % 60).padStart(2, "0")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={stopRest}
              >
                Skip
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sets */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Sets Completed</CardTitle>
              <Button size="sm" onClick={addSet}>
                <Plus className="size-4 mr-1" /> Add Set
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {exState.actualSets.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">
                Tap &ldquo;Add Set&rdquo; after each set
              </p>
            ) : (
              <div className="space-y-2">
                {exState.actualSets.map((set: ActualSet, i: number) => (
                  <div
                    key={i}
                    className="rounded-md border bg-muted/50 p-3 flex items-center gap-3"
                  >
                    <span className="text-sm text-muted-foreground w-8 tabular-nums">
                      #{i + 1}
                    </span>
                    {ex.type === "weight" ? (
                      <>
                        <div className="flex-1">
                          <Label className="text-xs">Reps</Label>
                          <Input
                            type="number"
                            className="text-lg h-11"
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
                            className="text-lg h-11"
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
                          className="text-lg h-11"
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
                      className="text-destructive hover:text-destructive shrink-0"
                      onClick={() => removeSet(i)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Rest Timer Buttons */}
            {exState.actualSets.length > 0 && ex.type === "weight" && (
              <div className="flex gap-2 mt-3">
                {[60, 90, 120, 180].map((s: number) => (
                  <Button
                    key={s}
                    variant="outline"
                    className="flex-1"
                    onClick={() => startRest(s)}
                  >
                    <Clock className="size-3.5 mr-1" />
                    {s >= 60
                      ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
                      : `${s}s`}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exercise Notes */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <Label className="flex items-center gap-1.5 mb-2 text-sm">
              <MessageSquare className="size-3.5" /> Exercise Notes
            </Label>
            <Textarea
              rows={2}
              placeholder="Form cues, modifications..."
              value={exState.notes}
              onChange={(e) =>
                updateExerciseState(currentExercise, { notes: e.target.value })
              }
            />
          </CardContent>
        </Card>

        {/* Progress Dots */}
        <div className="flex gap-1.5">
          {exerciseStates.map((state: ExerciseState, i: number) => (
            <button
              key={i}
              onClick={() => setCurrentExercise(i)}
              className={cn(
                "flex-1 h-2 rounded-full transition-colors",
                i === currentExercise
                  ? "bg-foreground"
                  : state.actualSets.length > 0
                  ? "bg-foreground/40"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Session Notes */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <Label className="flex items-center gap-1.5 mb-2 text-sm">
              <MessageSquare className="size-3.5" /> Session Notes
            </Label>
            <Textarea
              rows={3}
              placeholder="Overall session notes..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-safe">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={finishSession}
            disabled={saving}
          >
            <Check className="size-4 mr-2" />
            {saving ? "Saving..." : "Finish Session"}
          </Button>
        </div>
      </div>
    </div>
  );
}
