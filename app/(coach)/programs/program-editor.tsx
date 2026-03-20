"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  ChevronDown,
  ClipboardList,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createProgram, updateProgram } from "@/lib/actions/programs";

type Exercise = {
  id: string;
  name: string;
  category: string;
  type: string;
  muscles: string[];
};

type WorkoutExercise = {
  id?: string;
  exerciseId: string;
  name: string;
  type: string;
  category: string;
  sets: number;
  reps: number;
  weight: number;
  duration: number;
  distance: number;
  rest: number;
  notes: string;
};

type Workout = {
  id?: string;
  name: string;
  exercises: WorkoutExercise[];
};

type Program = {
  id?: string;
  name: string;
  description: string;
  workouts: Workout[];
};

export function ProgramEditor({
  program: initialProgram,
  exercises,
}: {
  program: Program;
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Program>(initialProgram);
  const [activeWorkout, setActiveWorkout] = useState(0);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState("All");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [draggedExercise, setDraggedExercise] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowExerciseDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories = ["All", ...new Set(exercises.map((e: Exercise) => e.category))];
  const filteredExercises = exercises.filter(
    (e: Exercise) =>
      (exerciseFilter === "All" || e.category === exerciseFilter) &&
      (exerciseSearch === "" ||
        e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
  );

  const addWorkout = () => {
    const newWorkout: Workout = {
      name: `Workout ${(form.workouts?.length || 0) + 1}`,
      exercises: [],
    };
    setForm((f) => ({ ...f, workouts: [...(f.workouts || []), newWorkout] }));
    setActiveWorkout(form.workouts?.length || 0);
  };

  const updateWorkout = (idx: number, updates: Partial<Workout>) => {
    setForm((f: Program) => ({
      ...f,
      workouts: f.workouts.map((w: Workout, i: number) => (i === idx ? { ...w, ...updates } : w)),
    }));
  };

  const deleteWorkout = (idx: number) => {
    setForm((f: Program) => ({ ...f, workouts: f.workouts.filter((_: Workout, i: number) => i !== idx) }));
    if (activeWorkout >= idx && activeWorkout > 0) {
      setActiveWorkout(activeWorkout - 1);
    }
  };

  const duplicateWorkout = (idx: number) => {
    const w = form.workouts[idx];
    const copy: Workout = {
      ...w,
      id: undefined,
      name: `${w.name} (Copy)`,
      exercises: w.exercises.map((e: WorkoutExercise) => ({ ...e, id: undefined })),
    };
    setForm((f) => ({
      ...f,
      workouts: [
        ...f.workouts.slice(0, idx + 1),
        copy,
        ...f.workouts.slice(idx + 1),
      ],
    }));
    setActiveWorkout(idx + 1);
  };

  const addExerciseToWorkout = (exercise: Exercise) => {
    const newEx: WorkoutExercise = {
      exerciseId: exercise.id,
      name: exercise.name,
      type: exercise.type,
      category: exercise.category,
      sets: 3,
      reps: 10,
      weight: 0,
      duration: 0,
      distance: 0,
      rest: 60,
      notes: "",
    };
    updateWorkout(activeWorkout, {
      exercises: [...(form.workouts[activeWorkout]?.exercises || []), newEx],
    });
    setShowExerciseDropdown(false);
    setExerciseSearch("");
  };

  const updateExercise = (exIdx: number, updates: Partial<WorkoutExercise>) => {
    const exs = form.workouts[activeWorkout].exercises.map((e: WorkoutExercise, i: number) =>
      i === exIdx ? { ...e, ...updates } : e
    );
    updateWorkout(activeWorkout, { exercises: exs });
  };

  const deleteExercise = (exIdx: number) => {
    updateWorkout(activeWorkout, {
      exercises: form.workouts[activeWorkout].exercises.filter(
        (_: WorkoutExercise, i: number) => i !== exIdx
      ),
    });
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedExercise(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedExercise !== null && draggedExercise !== idx) {
      setDragOverIndex(idx);
    }
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedExercise !== null && draggedExercise !== idx) {
      const exs = [...form.workouts[activeWorkout].exercises];
      const [removed] = exs.splice(draggedExercise, 1);
      exs.splice(idx, 0, removed);
      updateWorkout(activeWorkout, { exercises: exs });
    }
    setDraggedExercise(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedExercise(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const data = {
        name: form.name,
        description: form.description || undefined,
        workouts: form.workouts.map((w: Workout, wi: number) => ({
          name: w.name,
          order: wi,
          exercises: w.exercises.map((e: WorkoutExercise, ei: number) => ({
            exerciseId: e.exerciseId,
            order: ei,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            duration: e.duration,
            distance: e.distance,
            rest: e.rest,
            notes: e.notes || undefined,
          })),
        })),
      };

      if (form.id) {
        await updateProgram(form.id, data);
      } else {
        await createProgram(data);
      }
      router.push("/programs");
    } catch (error) {
      console.error("Failed to save program:", error);
    } finally {
      setSaving(false);
    }
  };

  const currentWorkout = form.workouts?.[activeWorkout];

  return (
    <div className="min-h-screen -m-4">
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/programs">
                <ArrowLeft size={20} />
              </Link>
            </Button>
            <div>
              <input
                className="bg-transparent text-xl font-bold border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 -ml-2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Program Name"
              />
              <input
                className="block bg-transparent text-sm text-muted-foreground border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 -ml-2 w-full"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Add description..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/programs">Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={!form.name || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 flex gap-4">
        {/* Workout Sidebar */}
        <div className="w-64 shrink-0">
          <div className="bg-card rounded-xl p-4 sticky top-24">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Workouts</h3>
              <Button size="icon" onClick={addWorkout}>
                <Plus size={16} />
              </Button>
            </div>
            {!form.workouts || form.workouts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No workouts yet
              </p>
            ) : (
              <div className="space-y-2">
                {form.workouts.map((w: Workout, i: number) => (
                  <div
                    key={i}
                    onClick={() => setActiveWorkout(i)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition group",
                      activeWorkout === i
                        ? "bg-purple-600"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{w.name}</p>
                        <p className="text-xs opacity-70">
                          {w.exercises?.length || 0} exercises
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex gap-1",
                          activeWorkout === i
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateWorkout(i);
                          }}
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkout(i);
                          }}
                          className="p-1 hover:bg-red-500/50 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {!currentWorkout ? (
            <div className="bg-card rounded-xl p-12 text-center">
              <ClipboardList
                size={48}
                className="mx-auto text-muted-foreground mb-4"
              />
              <h3 className="text-lg font-medium mb-2">Add your first workout</h3>
              <p className="text-muted-foreground mb-4">
                Programs contain multiple workouts
              </p>
              <Button onClick={addWorkout}>
                <Plus size={18} className="mr-2" /> Add Workout
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-card rounded-xl p-4">
                <input
                  className="bg-transparent text-lg font-semibold border-none outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 -ml-2 w-full"
                  value={currentWorkout.name}
                  onChange={(e) =>
                    updateWorkout(activeWorkout, { name: e.target.value })
                  }
                  placeholder="Workout Name"
                />
              </div>

              <div className="bg-card rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">
                    Exercises ({currentWorkout.exercises?.length || 0})
                  </h3>
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      size="sm"
                      onClick={() => setShowExerciseDropdown(!showExerciseDropdown)}
                    >
                      <Plus size={16} className="mr-1" /> Add Exercise{" "}
                      <ChevronDown
                        size={14}
                        className={cn(
                          "ml-1 transition",
                          showExerciseDropdown && "rotate-180"
                        )}
                      />
                    </Button>
                    {showExerciseDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-popover rounded-xl shadow-2xl border border-border z-20 overflow-hidden">
                        <div className="p-3 border-b border-border">
                          <Input
                            type="text"
                            placeholder="Search exercises..."
                            value={exerciseSearch}
                            onChange={(e) => setExerciseSearch(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {categories.map((c: string) => (
                              <button
                                key={c}
                                onClick={() => setExerciseFilter(c)}
                                className={cn(
                                  "px-2 py-0.5 rounded text-xs transition",
                                  exerciseFilter === c
                                    ? "bg-purple-600 text-white"
                                    : "bg-muted hover:bg-muted/80"
                                )}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {filteredExercises.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-4">
                              No exercises found
                            </p>
                          ) : (
                            filteredExercises.map((ex: Exercise) => (
                              <button
                                key={ex.id}
                                onClick={() => addExerciseToWorkout(ex)}
                                className="w-full px-3 py-2 text-left hover:bg-muted flex justify-between items-center group"
                              >
                                <div>
                                  <p className="text-sm font-medium">{ex.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {ex.muscles?.join(", ")}
                                  </p>
                                </div>
                                <Plus
                                  size={16}
                                  className="text-muted-foreground group-hover:text-purple-400"
                                />
                              </button>
                            ))
                          )}
                        </div>
                        <div className="p-2 border-t border-border">
                          <Link
                            href="/exercises/new"
                            className="block w-full text-sm text-purple-400 hover:text-purple-300 py-1 text-center"
                          >
                            + Create Custom Exercise
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!currentWorkout.exercises ||
                currentWorkout.exercises.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <Dumbbell
                      size={32}
                      className="mx-auto text-muted-foreground mb-2"
                    />
                    <p className="text-muted-foreground">No exercises yet</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Click "Add Exercise" to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentWorkout.exercises.map((ex: WorkoutExercise, i: number) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={(e) => handleDragStart(e, i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDrop={(e) => handleDrop(e, i)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "bg-muted rounded-lg p-4 transition",
                          draggedExercise === i && "opacity-50",
                          dragOverIndex === i && "ring-2 ring-purple-500"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground pt-1">
                            <GripVertical size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-medium">{ex.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {ex.category}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteExercise(i)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                            {ex.type === "weight" ? (
                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <Label className="text-xs">Sets</Label>
                                  <Input
                                    type="number"
                                    className="text-center"
                                    value={ex.sets}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        sets: parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Reps</Label>
                                  <Input
                                    type="number"
                                    className="text-center"
                                    value={ex.reps}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        reps: parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Weight</Label>
                                  <Input
                                    type="number"
                                    className="text-center"
                                    value={ex.weight}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        weight: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rest (s)</Label>
                                  <Input
                                    type="number"
                                    className="text-center"
                                    value={ex.rest}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        rest: parseInt(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Duration (min)</Label>
                                  <Input
                                    type="number"
                                    className="text-center"
                                    value={ex.duration}
                                    onChange={(e) =>
                                      updateExercise(i, {
                                        duration: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                  />
                                </div>
                                {ex.type === "cardio" && (
                                  <div>
                                    <Label className="text-xs">
                                      Distance (mi)
                                    </Label>
                                    <Input
                                      type="number"
                                      className="text-center"
                                      value={ex.distance}
                                      onChange={(e) =>
                                        updateExercise(i, {
                                          distance:
                                            parseFloat(e.target.value) || 0,
                                        })
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            <Input
                              className="mt-3"
                              placeholder="Notes (form cues, alternatives...)"
                              value={ex.notes}
                              onChange={(e) =>
                                updateExercise(i, { notes: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
