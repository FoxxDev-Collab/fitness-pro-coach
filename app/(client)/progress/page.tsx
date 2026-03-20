import { getMyProgress } from "@/lib/actions/client-portal";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { computeExerciseProgress } from "@/lib/utils/exercise-progress";
import { ProgressCharts } from "./progress-charts";

export default async function ProgressPage() {
  const { measurements, logs } = await getMyProgress();

  const fields = [
    { key: "weight" as const, label: "Weight", unit: "lbs" },
    { key: "bodyFat" as const, label: "Body Fat", unit: "%" },
    { key: "chest" as const, label: "Chest", unit: '"' },
    { key: "waist" as const, label: "Waist", unit: '"' },
    { key: "hips" as const, label: "Hips", unit: '"' },
    { key: "arms" as const, label: "Arms", unit: '"' },
    { key: "thighs" as const, label: "Thighs", unit: '"' },
  ];

  const getProgress = (key: string) => {
    const values = measurements.filter((m: Record<string, unknown>) => m[key] !== null);
    if (values.length < 2) return null;
    const first = values[values.length - 1][key as keyof typeof values[0]] as number;
    const last = values[0][key as keyof typeof values[0]] as number;
    return { first, last, change: last - first };
  };

  // Build assignments structure for exercise progress computation
  const assignmentMap = new Map<string, { id: string; workouts: { exercises: { name: string; type: string }[] }[] }>();
  for (const log of logs) {
    if (log.assignment && !assignmentMap.has(log.assignment.id)) {
      assignmentMap.set(log.assignment.id, {
        id: log.assignment.id,
        workouts: log.assignment.workouts.map((w) => ({
          exercises: w.exercises,
        })),
      });
    }
  }
  const assignments = Array.from(assignmentMap.values());
  const logsForProgress = logs.map((l) => ({
    assignmentId: l.assignment?.id || "",
    date: l.date,
    exercises: l.exercises.map((ex) => ({
      exerciseIndex: ex.exerciseIndex,
      weight: ex.weight,
      setDetails: ex.setDetails.map((s) => ({
        weight: s.weight,
        reps: s.reps,
      })),
    })),
  }));
  const exerciseProgress = computeExerciseProgress(logsForProgress, assignments);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">
          {logs.length} sessions · {measurements.length} measurements
        </p>
      </div>

      {/* Charts */}
      <ProgressCharts
        measurements={measurements}
        exerciseProgress={exerciseProgress}
      />

      {/* Measurement Cards */}
      {measurements.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {fields.map((f) => {
            const p = getProgress(f.key);
            if (!p) return null;
            return (
              <Card key={f.key}>
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                  <p className="text-lg font-bold tabular-nums">
                    {p.last}{f.unit}
                  </p>
                  <p className={cn(
                    "text-xs tabular-nums",
                    p.change < 0 ? "text-success" : p.change > 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {p.change > 0 ? "+" : ""}{p.change.toFixed(1)}{f.unit}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Session History */}
      <div>
        <h2 className="text-sm font-medium mb-3">Recent Sessions</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No sessions yet</p>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 20).map((log) => {
              const workout = log.assignment?.workouts?.[log.workoutIndex];
              const workoutName = workout?.name || "Workout";
              return (
                <Card key={log.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{workoutName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.date).toLocaleDateString()} · {log.duration || "?"}min
                        </p>
                      </div>
                    </div>
                    {log.exercises.map((ex) => {
                      const exerciseName = workout?.exercises?.[ex.exerciseIndex]?.name;
                      return (
                        <div key={ex.id} className="text-sm border-t pt-2 mt-2">
                          <p className="font-medium text-sm">
                            {exerciseName || `Exercise ${ex.exerciseIndex + 1}`}
                          </p>
                          {ex.setDetails.length > 0 ? (
                            <p className="text-muted-foreground">
                              {ex.setDetails.length} sets:{" "}
                              {ex.setDetails
                                .map((s) =>
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
        )}
      </div>
    </div>
  );
}
