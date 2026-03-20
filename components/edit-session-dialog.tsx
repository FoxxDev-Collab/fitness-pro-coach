"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateSession } from "@/lib/actions/sessions";
import { useRouter } from "next/navigation";

type SetDetail = {
  reps: number | null;
  weight: number | null;
  duration: number | null;
};

type Exercise = {
  id: string;
  exerciseIndex: number;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  notes: string | null;
  setDetails: SetDetail[];
};

type SessionLog = {
  id: string;
  date: Date;
  sessionNotes: string | null;
  exercises: Exercise[];
};

export function EditSessionDialog({
  session,
  children,
}: {
  session: SessionLog;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(session.sessionNotes || "");
  const [exercises, setExercises] = useState(
    session.exercises.map((ex) => ({
      exerciseIndex: ex.exerciseIndex,
      notes: ex.notes || "",
      sets: ex.setDetails.map((s) => ({
        reps: s.reps ?? 0,
        weight: s.weight ?? 0,
        duration: s.duration ?? 0,
      })),
    }))
  );

  const updateExSet = (
    exIdx: number,
    setIdx: number,
    field: string,
    value: number
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIdx ? { ...s, [field]: value } : s
              ),
            }
          : ex
      )
    );
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  reps: ex.sets[ex.sets.length - 1]?.reps ?? 0,
                  weight: ex.sets[ex.sets.length - 1]?.weight ?? 0,
                  duration: 0,
                },
              ],
            }
          : ex
      )
    );
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) }
          : ex
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSession(session.id, {
        sessionNotes: notes || undefined,
        date: new Date(session.date),
        exercises: exercises
          .filter((ex) => ex.sets.length > 0)
          .map((ex) => ({
            exerciseIndex: ex.exerciseIndex,
            sets: ex.sets.length,
            reps: ex.sets[0]?.reps || 0,
            weight: Math.max(...ex.sets.map((s) => s.weight), 0),
            notes: ex.notes || undefined,
            setDetails: ex.sets.map((s, i) => ({
              setNumber: i + 1,
              reps: s.reps || undefined,
              weight: s.weight || undefined,
              duration: s.duration || undefined,
            })),
          })),
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update session:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {exercises.map((ex, exIdx) => (
            <div key={exIdx} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">
                  Exercise {ex.exerciseIndex + 1}
                </Label>
                <Button size="sm" variant="outline" onClick={() => addSet(exIdx)}>
                  <Plus className="size-3 mr-1" /> Set
                </Button>
              </div>
              {ex.sets.map((set, setIdx) => (
                <div
                  key={setIdx}
                  className="flex items-center gap-2 rounded-md border bg-muted/50 p-2"
                >
                  <span className="text-xs text-muted-foreground w-6">
                    #{setIdx + 1}
                  </span>
                  <div className="flex-1">
                    <Label className="text-xs">Reps</Label>
                    <Input
                      type="number"
                      value={set.reps}
                      onChange={(e) =>
                        updateExSet(exIdx, setIdx, "reps", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Weight</Label>
                    <Input
                      type="number"
                      value={set.weight}
                      onChange={(e) =>
                        updateExSet(exIdx, setIdx, "weight", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0 mt-4"
                    onClick={() => removeSet(exIdx, setIdx)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Textarea
                rows={1}
                placeholder="Exercise notes..."
                value={ex.notes}
                onChange={(e) =>
                  setExercises((prev) =>
                    prev.map((x, i) =>
                      i === exIdx ? { ...x, notes: e.target.value } : x
                    )
                  )
                }
              />
            </div>
          ))}

          <div>
            <Label className="text-sm">Session Notes</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Pencil className="size-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
