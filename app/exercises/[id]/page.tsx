import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Dumbbell,
  FileText,
  AlertTriangle,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteExerciseButton } from "./delete-button";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = await db.exercise.findUnique({ where: { id } });

  if (!exercise) {
    notFound();
  }

  // Get exercise history from session logs
  type HistoryEntry = {
    id: string;
    sets: number | null;
    reps: number | null;
    weight: number | null;
    duration: number | null;
    sessionLog: {
      date: Date;
      assignment: {
        client: {
          id: string;
          name: string;
        };
      };
    };
    setDetails: {
      weight: number | null;
      reps: number | null;
    }[];
  };

  const history: HistoryEntry[] = await db.sessionExercise.findMany({
    where: {
      sessionLog: {
        assignment: {
          workouts: {
            some: {
              exercises: {
                some: {
                  exerciseId: id,
                },
              },
            },
          },
        },
      },
    },
    include: {
      sessionLog: {
        include: {
          assignment: {
            include: {
              client: true,
            },
          },
        },
      },
      setDetails: true,
    },
    orderBy: {
      sessionLog: {
        date: "desc",
      },
    },
    take: 10,
  });

  // Calculate client stats
  const clientStats: Record<
    string,
    { name: string; sessions: number; maxWeight: number; totalVolume: number }
  > = {};
  history.forEach((h: HistoryEntry) => {
    const clientId = h.sessionLog.assignment.client.id;
    const clientName = h.sessionLog.assignment.client.name;
    if (!clientStats[clientId]) {
      clientStats[clientId] = {
        name: clientName,
        sessions: 0,
        maxWeight: 0,
        totalVolume: 0,
      };
    }
    clientStats[clientId].sessions++;
    if (h.weight && h.weight > clientStats[clientId].maxWeight) {
      clientStats[clientId].maxWeight = h.weight;
    }
    h.setDetails.forEach((s: { weight: number | null; reps: number | null }) => {
      clientStats[clientId].totalVolume += (s.weight || 0) * (s.reps || 0);
    });
  });

  return (
    <div>
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10 -mx-4 -mt-4 mb-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/exercises">
                <ArrowLeft size={20} />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">{exercise.name}</h1>
          </div>
          <div className="flex gap-2">
            {exercise.custom && <DeleteExerciseButton id={exercise.id} name={exercise.name} />}
            <Button asChild>
              <Link href={`/exercises/${exercise.id}/edit`}>Edit</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Image & Basic Info */}
          <div className="md:col-span-1">
            <div className="aspect-square bg-card rounded-xl flex items-center justify-center overflow-hidden mb-4">
              {exercise.image ? (
                <img
                  src={exercise.image}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Dumbbell size={48} className="text-muted-foreground" />
              )}
            </div>
            <div className="bg-card rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span>{exercise.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize">{exercise.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipment</span>
                <span>{exercise.equipment || "None"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">
                  Muscles
                </span>
                <div className="flex flex-wrap gap-1">
                  {exercise.muscles?.map((m) => (
                    <Badge key={m} variant="secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              {exercise.custom && (
                <div className="text-xs text-purple-400 pt-2 border-t border-border">
                  Custom Exercise
                </div>
              )}
            </div>
          </div>

          {/* Instructions & Tips */}
          <div className="md:col-span-2 space-y-4">
            {exercise.instructions && (
              <div className="bg-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-purple-400" />
                  <h3 className="font-semibold">How To Perform</h3>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {exercise.instructions}
                </p>
              </div>
            )}

            {exercise.tips && (
              <div className="bg-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-yellow-400" />
                  <h3 className="font-semibold">Coaching Tips</h3>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {exercise.tips}
                </p>
              </div>
            )}

            {/* Client Performance Data */}
            <div className="bg-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-green-400" />
                <h3 className="font-semibold">Client Performance Data</h3>
              </div>
              {Object.keys(clientStats).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No session data yet
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(clientStats).map(([clientId, stats]) => (
                    <div key={clientId} className="bg-muted rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{stats.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {stats.sessions} sessions
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Max Weight:
                          </span>{" "}
                          <span className="text-green-400">
                            {stats.maxWeight} lbs
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Total Volume:
                          </span>{" "}
                          <span className="text-blue-400">
                            {stats.totalVolume.toLocaleString()} lbs
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent History */}
            {history.length > 0 && (
              <div className="bg-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={18} className="text-blue-400" />
                  <h3 className="font-semibold">Recent Sessions</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="bg-muted rounded-lg p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {h.sessionLog.assignment.client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(h.sessionLog.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        {h.setDetails.length > 0 ? (
                          <span className="text-muted-foreground">
                            {h.setDetails.length} sets · max{" "}
                            {Math.max(
                              ...h.setDetails.map((s) => s.weight || 0)
                            )}{" "}
                            lbs
                          </span>
                        ) : h.weight ? (
                          <span className="text-muted-foreground">
                            {h.sets}×{h.reps} @ {h.weight} lbs
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {h.duration} min
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
