"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Plus, Edit2, Trash2, Ruler, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AssignProgramDialog } from "@/components/assign-program-dialog";
import { MeasurementDialog } from "@/components/measurement-dialog";
import { deleteAssignment } from "@/lib/actions/assignments";
import { deleteMeasurement } from "@/lib/actions/measurements";

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

export function ClientTabs({
  client,
  assignments,
  logs,
  measurements,
}: {
  client: Client;
  assignments: Assignment[];
  logs: Log[];
  measurements: Measurement[];
}) {
  const [tab, setTab] = useState("overview");
  const [selectWorkout, setSelectWorkout] = useState<Assignment | null>(null);

  const tabs = ["overview", "programs", "history", "measurements", "calendar"];

  if (selectWorkout) {
    return (
      <div>
        <Button variant="ghost" onClick={() => setSelectWorkout(null)} className="mb-4">
          <ChevronLeft size={16} className="mr-1" /> Back
        </Button>
        <h2 className="text-xl font-bold mb-4">
          Start Session: {selectWorkout.name.split(" - ")[0]}
        </h2>
        <div className="space-y-2">
          {selectWorkout.workouts?.map((w: Assignment["workouts"][number], i: number) => (
            <Link
              key={w.id}
              href={`/session/${selectWorkout.id}/${i}`}
              className="w-full bg-card hover:bg-card/80 rounded-lg p-4 text-left flex justify-between items-center block"
            >
              <div>
                <p className="font-medium">{w.name}</p>
                <p className="text-sm text-muted-foreground">
                  {w.exercises?.length || 0} exercises
                </p>
              </div>
              <Play className="text-green-500" size={24} />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map((t: string) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 rounded text-sm capitalize whitespace-nowrap transition",
              tab === t ? "bg-purple-600 text-white" : "bg-muted hover:bg-muted/80"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          client={client}
          assignments={assignments}
          logs={logs}
          onSelectWorkout={setSelectWorkout}
        />
      )}
      {tab === "programs" && (
        <ProgramsTab
          client={client}
          assignments={assignments}
          onSelectWorkout={setSelectWorkout}
        />
      )}
      {tab === "history" && <HistoryTab logs={logs} assignments={assignments} />}
      {tab === "measurements" && (
        <MeasurementsTab clientId={client.id} measurements={measurements} />
      )}
      {tab === "calendar" && <CalendarTab logs={logs} />}
    </>
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

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-400">{assignments.length}</p>
          <p className="text-xs text-muted-foreground">Programs</p>
        </div>
        <div className="bg-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="bg-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{daysSinceCreated}</p>
          <p className="text-xs text-muted-foreground">Days</p>
        </div>
      </div>
      {assignments.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Play size={16} className="text-green-500" /> Start Session
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {assignments.map((a: Assignment) => (
              <button
                key={a.id}
                onClick={() => onSelectWorkout(a)}
                className="bg-green-700 hover:bg-green-600 rounded-lg p-3 text-left"
              >
                <p className="font-medium">{a.name.split(" - ")[0]}</p>
                <p className="text-xs opacity-80">{a.workouts?.length} workouts</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
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
    <>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Assigned Programs</h3>
        <AssignProgramDialog clientId={client.id} clientName={client.name}>
          <Button size="sm">
            <Plus size={16} className="mr-1" /> Assign
          </Button>
        </AssignProgramDialog>
      </div>
      {assignments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No programs assigned</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a: Assignment) => (
            <div
              key={a.id}
              className="bg-card rounded-lg p-3 flex justify-between items-center"
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
                  variant="default"
                  className="bg-green-700 hover:bg-green-600"
                  onClick={() => onSelectWorkout(a)}
                >
                  <Play size={14} className="mr-1" /> Start
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
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
    return <p className="text-muted-foreground text-center py-8">No sessions logged</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log: Log) => {
        const assignment = assignments.find((a: Assignment) =>
          a.logs.some((l: Log) => l.id === log.id)
        );
        const workout = assignment?.workouts?.[log.workoutIndex];

        return (
          <div key={log.id} className="bg-card rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{workout?.name || "Workout"}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(log.date).toLocaleDateString()} · {log.duration || "?"}min
                </p>
              </div>
            </div>
            {log.exercises.map((ex: Log["exercises"][number], idx: number) => {
              const origEx = workout?.exercises?.[ex.exerciseIndex];
              return (
                <div
                  key={ex.id}
                  className="text-sm border-t border-border pt-2 mt-2"
                >
                  <p className="text-foreground">
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
                    <p className="text-yellow-400/80 text-xs mt-1">
                      {ex.notes}
                    </p>
                  )}
                </div>
              );
            })}
            {log.sessionNotes && (
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-sm text-purple-400">Notes: {log.sessionNotes}</p>
              </div>
            )}
          </div>
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
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Ruler size={18} /> Measurements
        </h3>
        <MeasurementDialog clientId={clientId}>
          <Button size="sm">
            <Plus size={16} className="mr-1" /> Record
          </Button>
        </MeasurementDialog>
      </div>
      {measurements.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No measurements</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {fields.map((f: { key: keyof Measurement; label: string; unit: string }) => {
              const p = getProgress(f.key);
              if (!p) return null;
              return (
                <div key={f.key} className="bg-card rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                  <p className="text-lg font-bold">
                    {p.last}
                    {f.unit}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      p.change < 0
                        ? "text-green-400"
                        : p.change > 0
                        ? "text-red-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {p.change > 0 ? "+" : ""}
                    {p.change.toFixed(1)}
                    {f.unit}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            {measurements.map((m: Measurement) => (
              <div
                key={m.id}
                className="bg-card rounded-lg p-3 flex justify-between items-start"
              >
                <div>
                  <p className="font-medium">
                    {new Date(m.date).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground mt-1">
                    {m.weight && <span>Weight: {m.weight}lbs</span>}
                    {m.bodyFat && <span>BF: {m.bodyFat}%</span>}
                    {m.chest && <span>Chest: {m.chest}"</span>}
                    {m.waist && <span>Waist: {m.waist}"</span>}
                    {m.hips && <span>Hips: {m.hips}"</span>}
                    {m.arms && <span>Arms: {m.arms}"</span>}
                    {m.thighs && <span>Thighs: {m.thighs}"</span>}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(m.id)}
                >
                  <Trash2 size={14} />
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
        >
          <ChevronLeft size={18} />
        </Button>
        <h3 className="font-semibold">
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
          <ChevronRight size={18} />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d: string, i: number) => (
          <div key={i} className="text-center text-xs text-muted-foreground py-1">
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
                "aspect-square rounded-lg p-1",
                day ? "bg-card" : "",
                isToday(day) ? "ring-2 ring-purple-500" : ""
              )}
            >
              {day && (
                <>
                  <p
                    className={cn(
                      "text-xs",
                      isToday(day)
                        ? "text-purple-400 font-bold"
                        : "text-muted-foreground"
                    )}
                  >
                    {day}
                  </p>
                  {dayLogs.length > 0 && (
                    <div className="mt-1 w-2 h-2 bg-green-500 rounded-full mx-auto" />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground mt-4 text-center">
        {monthLogs.length} sessions this month
      </p>
    </div>
  );
}
