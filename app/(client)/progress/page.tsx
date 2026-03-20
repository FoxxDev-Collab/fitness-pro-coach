import { getMyProgress } from "@/lib/actions/client-portal";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">
          {logs.length} sessions · {measurements.length} measurements
        </p>
      </div>

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
          <div className="space-y-2">
            {logs.slice(0, 20).map((log) => {
              const workoutName = log.assignment?.workouts?.[log.workoutIndex]?.name || "Workout";
              return (
                <Card key={log.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{workoutName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.date).toLocaleDateString()} · {log.duration || "?"}min
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.exercises.length} exercises
                      </p>
                    </div>
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
