"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Plus, Trash2, Ruler, ChevronLeft, ChevronRight, Pencil, Pin, StickyNote, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AssignProgramDialog } from "@/components/assign-program-dialog";
import { MeasurementDialog } from "@/components/measurement-dialog";
import { MeasurementChart } from "@/components/charts/measurement-chart";
import { deleteAssignment } from "@/lib/actions/assignments";
import { deleteMeasurement } from "@/lib/actions/measurements";
import { deleteSession } from "@/lib/actions/sessions";
import { EditSessionDialog } from "@/components/edit-session-dialog";
import { createNote, updateNote, deleteNote, togglePinNote } from "@/lib/actions/notes";
import { Textarea } from "@/components/ui/textarea";

type Client = {
  id: string;
  name: string;
  createdAt: Date;
};

type Assignment = {
  id: string;
  name: string;
  workouts: {
    id: string;
    name: string;
    exercises: { id: string }[];
  }[];
  logs: {
    id: string;
    date: Date;
    duration: number | null;
    workoutIndex: number;
    sessionNotes: string | null;
    exercises: {
      id: string;
      exerciseIndex: number;
      sets: number | null;
      reps: number | null;
      weight: number | null;
      duration: number | null;
      notes: string | null;
      setDetails: {
        reps: number | null;
        weight: number | null;
        duration: number | null;
      }[];
    }[];
  }[];
};

type Measurement = {
  id: string;
  date: Date;
  weight: number | null;
  bodyFat: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arms: number | null;
  thighs: number | null;
};

type Log = Assignment["logs"][0];

type ClientNote = {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  coach: { name: string | null };
};

export function ClientTabs({
  client,
  assignments,
  logs,
  measurements,
  notes,
}: {
  client: Client;
  assignments: Assignment[];
  logs: Log[];
  measurements: Measurement[];
  notes: ClientNote[];
}) {
  const [selectWorkout, setSelectWorkout] = useState<Assignment | null>(null);

  if (selectWorkout) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectWorkout(null)}>
          <ChevronLeft className="size-4 mr-1" /> Back
        </Button>
        <h2 className="text-xl font-semibold tracking-tight">
          Start Session: {selectWorkout.name.split(" - ")[0]}
        </h2>
        <div className="space-y-2">
          {selectWorkout.workouts?.map((w: Assignment["workouts"][number], i: number) => (
            <Link
              key={w.id}
              href={`/session/${selectWorkout.id}/${i}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent block"
            >
              <div>
                <p className="font-medium">{w.name}</p>
                <p className="text-sm text-muted-foreground">
                  {w.exercises?.length || 0} exercises
                </p>
              </div>
              <Play className="size-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="programs">Programs</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="measurements">Measurements</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <OverviewTab
          client={client}
          assignments={assignments}
          logs={logs}
          onSelectWorkout={setSelectWorkout}
        />
      </TabsContent>
      <TabsContent value="programs" className="mt-4">
        <ProgramsTab
          client={client}
          assignments={assignments}
          onSelectWorkout={setSelectWorkout}
        />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <HistoryTab logs={logs} assignments={assignments} />
      </TabsContent>
      <TabsContent value="measurements" className="mt-4">
        <MeasurementsTab clientId={client.id} measurements={measurements} />
      </TabsContent>
      <TabsContent value="calendar" className="mt-4">
        <CalendarTab logs={logs} />
      </TabsContent>
      <TabsContent value="notes" className="mt-4">
        <NotesTab clientId={client.id} notes={notes} />
      </TabsContent>
    </Tabs>
  );
}

function OverviewTab({
  client,
  assignments,
  logs,
  onSelectWorkout,
}: {
  client: Client;
  assignments: Assignment[];
  logs: Log[];
  onSelectWorkout: (a: Assignment) => void;
}) {
  const daysSinceCreated = Math.round(
    (Date.now() - new Date(client.createdAt).getTime()) / 86400000
  );

  const stats = [
    { label: "Programs", value: assignments.length },
    { label: "Sessions", value: logs.length },
    { label: "Days", value: daysSinceCreated },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {assignments.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Play className="size-4" /> Start Session
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {assignments.map((a: Assignment) => (
              <Button
                key={a.id}
                variant="outline"
                className="h-auto py-3 flex-col items-start text-left"
                onClick={() => onSelectWorkout(a)}
              >
                <span className="font-medium">{a.name.split(" - ")[0]}</span>
                <span className="text-xs text-muted-foreground">{a.workouts?.length} workouts</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgramsTab({
  client,
  assignments,
  onSelectWorkout,
}: {
  client: Client;
  assignments: Assignment[];
  onSelectWorkout: (a: Assignment) => void;
}) {
  const handleDelete = async (id: string) => {
    if (confirm("Delete this assignment?")) {
      await deleteAssignment(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Assigned Programs</h3>
        <AssignProgramDialog clientId={client.id} clientName={client.name}>
          <Button size="sm">
            <Plus className="size-4 mr-1" /> Assign
          </Button>
        </AssignProgramDialog>
      </div>
      {assignments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm">No programs assigned</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a: Assignment) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-sm text-muted-foreground">
                  {a.workouts?.length || 0} workouts
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onSelectWorkout(a)}
                >
                  <Play className="size-3.5 mr-1" /> Start
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab({
  logs,
  assignments,
}: {
  logs: Log[];
  assignments: Assignment[];
}) {
  if (logs.length === 0) {
    return <p className="text-muted-foreground text-center py-8 text-sm">No sessions logged</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log: Log) => {
        const assignment = assignments.find((a: Assignment) =>
          a.logs.some((l: Log) => l.id === log.id)
        );
        const workout = assignment?.workouts?.[log.workoutIndex];

        return (
          <Card key={log.id}>
            <CardContent className="pt-4 pb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{workout?.name || "Workout"}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.date).toLocaleDateString()} · {log.duration || "?"}min
                  </p>
                </div>
                <div className="flex gap-1">
                  <EditSessionDialog session={log}>
                    <Button size="icon" variant="ghost" className="size-7">
                      <Pencil className="size-3.5" />
                    </Button>
                  </EditSessionDialog>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={async () => {
                      if (confirm("Delete this session?")) {
                        await deleteSession(log.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              {log.exercises.map((ex: Log["exercises"][number]) => {
                return (
                  <div
                    key={ex.id}
                    className="text-sm border-t pt-2 mt-2"
                  >
                    <p className="font-medium text-sm">
                      Exercise {ex.exerciseIndex + 1}
                    </p>
                    {ex.setDetails.length > 0 ? (
                      <p className="text-muted-foreground">
                        {ex.setDetails.length} sets:{" "}
                        {ex.setDetails
                          .map((s: Log["exercises"][number]["setDetails"][number]) =>
                            s.weight ? `${s.reps}×${s.weight}lb` : `${s.duration}min`
                          )
                          .join(", ")}
                      </p>
                    ) : ex.weight ? (
                      <p className="text-muted-foreground">
                        {ex.sets}×{ex.reps} @ {ex.weight}lb
                      </p>
                    ) : null}
                    {ex.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {ex.notes}
                      </p>
                    )}
                  </div>
                );
              })}
              {log.sessionNotes && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm text-muted-foreground italic">Notes: {log.sessionNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MeasurementsTab({
  clientId,
  measurements,
}: {
  clientId: string;
  measurements: Measurement[];
}) {
  const fields: { key: keyof Measurement; label: string; unit: string }[] = [
    { key: "weight", label: "Weight", unit: "lbs" },
    { key: "bodyFat", label: "Body Fat", unit: "%" },
    { key: "chest", label: "Chest", unit: '"' },
    { key: "waist", label: "Waist", unit: '"' },
    { key: "hips", label: "Hips", unit: '"' },
    { key: "arms", label: "Arms", unit: '"' },
    { key: "thighs", label: "Thighs", unit: '"' },
  ];

  const getProgress = (key: keyof Measurement) => {
    const values = measurements.filter((m) => m[key] !== null);
    if (values.length < 2) return null;
    const first = values[values.length - 1][key] as number;
    const last = values[0][key] as number;
    return { first, last, change: last - first };
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this measurement?")) {
      await deleteMeasurement(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Ruler className="size-4" /> Measurements
        </h3>
        <MeasurementDialog clientId={clientId}>
          <Button size="sm">
            <Plus className="size-4 mr-1" /> Record
          </Button>
        </MeasurementDialog>
      </div>
      {measurements.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm">No measurements</p>
      ) : (
        <>
          <MeasurementChart measurements={measurements} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {fields.map((f: { key: keyof Measurement; label: string; unit: string }) => {
              const p = getProgress(f.key);
              if (!p) return null;
              return (
                <Card key={f.key}>
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                    <p className="text-lg font-bold tabular-nums">
                      {p.last}
                      {f.unit}
                    </p>
                    <p
                      className={cn(
                        "text-xs tabular-nums",
                        p.change < 0
                          ? "text-success"
                          : p.change > 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {p.change > 0 ? "+" : ""}
                      {p.change.toFixed(1)}
                      {f.unit}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="space-y-2">
            {measurements.map((m: Measurement) => (
              <div
                key={m.id}
                className="flex items-start justify-between rounded-lg border bg-card p-4"
              >
                <div>
                  <p className="font-medium text-sm">
                    {new Date(m.date).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground mt-1">
                    {m.weight && <span>Weight: {m.weight}lbs</span>}
                    {m.bodyFat && <span>BF: {m.bodyFat}%</span>}
                    {m.chest && <span>Chest: {m.chest}&quot;</span>}
                    {m.waist && <span>Waist: {m.waist}&quot;</span>}
                    {m.hips && <span>Hips: {m.hips}&quot;</span>}
                    {m.arms && <span>Arms: {m.arms}&quot;</span>}
                    {m.thighs && <span>Thighs: {m.thighs}&quot;</span>}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleDelete(m.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CalendarTab({ logs }: { logs: Log[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const getLogsForDay = (day: number | null) => {
    if (!day) return [];
    const d = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return logs.filter((l) => l.date.toISOString().startsWith(d));
  };

  const today = new Date();
  const isToday = (day: number | null) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const monthLogs = logs.filter(
    (l: Log) =>
      new Date(l.date).getMonth() === month &&
      new Date(l.date).getFullYear() === year
  );

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h3 className="font-medium text-sm">
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((d: string, i: number) => (
            <div key={i} className="text-center text-xs text-muted-foreground py-1 font-medium">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day: number | null, i: number) => {
            const dayLogs = getLogsForDay(day);
            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-md flex flex-col items-center justify-center p-1",
                  day ? "bg-muted/50" : "",
                  isToday(day) ? "ring-2 ring-foreground" : ""
                )}
              >
                {day && (
                  <>
                    <p
                      className={cn(
                        "text-xs",
                        isToday(day)
                          ? "font-bold"
                          : "text-muted-foreground"
                      )}
                    >
                      {day}
                    </p>
                    {dayLogs.length > 0 && (
                      <div className="mt-0.5 size-1.5 bg-foreground rounded-full" />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {monthLogs.length} sessions this month
        </p>
      </CardContent>
    </Card>
  );
}

function NotesTab({
  clientId,
  notes,
}: {
  clientId: string;
  notes: ClientNote[];
}) {
  const router = useRouter();
  const [newNote, setNewNote] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleCreate = async () => {
    if (!newNote.trim()) return;
    setSending(true);
    try {
      await createNote(clientId, newNote.trim());
      setNewNote("");
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return;
    await updateNote(noteId, editContent.trim());
    setEditingId(null);
    router.refresh();
  };

  const handleDelete = async (noteId: string) => {
    if (confirm("Delete this note?")) {
      await deleteNote(noteId);
      router.refresh();
    }
  };

  const handlePin = async (noteId: string) => {
    await togglePinNote(noteId);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="size-4" /> Trainer Notes
        </h3>
      </div>

      {/* New note input */}
      <div className="flex gap-2">
        <Textarea
          rows={2}
          placeholder="Add a note for this client..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={handleCreate}
          disabled={sending || !newNote.trim()}
          className="shrink-0 self-end"
        >
          <Send className="size-4 mr-1" />
          {sending ? "Saving..." : "Add"}
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm">
          No notes yet. Add a note above.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id} className={cn(note.pinned && "border-foreground/30")}>
              <CardContent className="pt-3 pb-3">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {note.pinned && <Pin className="size-3" />}
                    <span>
                      {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => handlePin(note.id)}
                      title={note.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className={cn("size-3.5", note.pinned && "fill-current")} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditContent(note.content);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={2}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleUpdate(note.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
