"use client";

import { useState } from "react";
import { ChevronRight, TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClientStat = {
  id: string;
  name: string;
  totalLogs: number;
  recentLogs: number;
  totalMinutes: number;
};

type Assignment = {
  id: string;
  clientId: string;
  workouts: {
    exercises: {
      name: string;
      type: string;
    }[];
  }[];
};

type SessionLog = {
  id: string;
  assignmentId: string;
  date: Date;
  duration: number | null;
  exercises: {
    exerciseIndex: number;
    weight: number | null;
    setDetails: {
      weight: number | null;
      reps: number | null;
    }[];
  }[];
};

export function ReportsClientView({
  clientStats,
  assignments,
  logs,
}: {
  clientStats: ClientStat[];
  assignments: Assignment[];
  logs: SessionLog[];
}) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const client = clientStats.find((c) => c.id === selectedClient);

  if (client) {
    const clientAssignments = assignments.filter((a) => a.clientId === client.id);
    const clientLogs = logs
      .filter((l) => clientAssignments.some((a) => a.id === l.assignmentId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate exercise progress
    const exerciseProgress: Record<
      string,
      { name: string; entries: { date: Date; weight: number }[] }
    > = {};

    clientLogs.forEach((log) => {
      const assignment = clientAssignments.find((a) => a.id === log.assignmentId);
      if (!assignment) return;

      log.exercises.forEach((ex) => {
        const workout = assignment.workouts[0]; // Simplified
        if (!workout) return;

        const exerciseInfo = workout.exercises[ex.exerciseIndex];
        if (!exerciseInfo || exerciseInfo.type !== "weight") return;

        const maxWeight = ex.setDetails.length > 0
          ? Math.max(...ex.setDetails.map((s) => s.weight || 0))
          : ex.weight || 0;

        if (maxWeight > 0) {
          if (!exerciseProgress[exerciseInfo.name]) {
            exerciseProgress[exerciseInfo.name] = {
              name: exerciseInfo.name,
              entries: [],
            };
          }
          exerciseProgress[exerciseInfo.name].entries.push({
            date: log.date,
            weight: maxWeight,
          });
        }
      });
    });

    const thisWeekLogs = clientLogs.filter(
      (l) => new Date(l.date).getTime() > Date.now() - 604800000
    );

    return (
      <div>
        <Button
          variant="ghost"
          onClick={() => setSelectedClient(null)}
          className="mb-4 text-purple-400"
        >
          <ArrowLeft size={16} className="mr-1" /> All
        </Button>

        <h2 className="text-xl font-bold mb-4">{client.name}'s Progress</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {clientLogs.length}
            </p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">
              {client.totalMinutes}
            </p>
            <p className="text-xs text-muted-foreground">Total Mins</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">
              {clientAssignments.length}
            </p>
            <p className="text-xs text-muted-foreground">Programs</p>
          </div>
          <div className="bg-card rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {thisWeekLogs.length}
            </p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
        </div>

        {/* Strength Progress */}
        {Object.keys(exerciseProgress).length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp size={18} /> Strength Progress
            </h3>
            <div className="space-y-3">
              {Object.entries(exerciseProgress)
                .slice(0, 6)
                .map(([name, data]) => {
                  const entries = data.entries.sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  const first = entries[0]?.weight || 0;
                  const last = entries[entries.length - 1]?.weight || 0;
                  const change = last - first;

                  return (
                    <div key={name} className="bg-card rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-medium">{name}</p>
                        <span
                          className={cn(
                            "text-sm",
                            change > 0
                              ? "text-green-400"
                              : change < 0
                              ? "text-red-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {change > 0 ? "+" : ""}
                          {change} lbs
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {first} → {last} lbs ({entries.length} sessions)
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Client list sorted by activity
  const sortedClients = [...clientStats].sort(
    (a, b) => b.recentLogs - a.recentLogs
  );

  return (
    <div className="space-y-2">
      {sortedClients.map((c) => (
        <div
          key={c.id}
          onClick={() => setSelectedClient(c.id)}
          className="bg-card rounded-lg p-4 cursor-pointer hover:border-purple-500/50 border border-transparent transition flex justify-between items-center"
        >
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-muted-foreground">
              {c.totalLogs} sessions · {c.recentLogs} this week
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                c.recentLogs >= 3
                  ? "bg-green-500"
                  : c.recentLogs > 0
                  ? "bg-yellow-500"
                  : "bg-red-500"
              )}
            />
            <ChevronRight className="text-muted-foreground" size={18} />
          </div>
        </div>
      ))}
    </div>
  );
}
