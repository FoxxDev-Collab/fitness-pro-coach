"use client";

import { useState } from "react";
import { ChevronRight, TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const client = clientStats.find((c: ClientStat) => c.id === selectedClient);

  if (client) {
    const clientAssignments = assignments.filter((a: Assignment) => a.clientId === client.id);
    const clientLogs = logs
      .filter((l: SessionLog) => clientAssignments.some((a: Assignment) => a.id === l.assignmentId))
      .sort((a: SessionLog, b: SessionLog) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const exerciseProgress: Record<
      string,
      { name: string; entries: { date: Date; weight: number }[] }
    > = {};

    clientLogs.forEach((log: SessionLog) => {
      const assignment = clientAssignments.find((a: Assignment) => a.id === log.assignmentId);
      if (!assignment) return;

      log.exercises.forEach((ex: SessionLog["exercises"][number]) => {
        const workout = assignment.workouts[0];
        if (!workout) return;

        const exerciseInfo = workout.exercises[ex.exerciseIndex];
        if (!exerciseInfo || exerciseInfo.type !== "weight") return;

        const maxWeight = ex.setDetails.length > 0
          ? Math.max(...ex.setDetails.map((s: { weight: number | null; reps: number | null }) => s.weight || 0))
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
      (l: SessionLog) => new Date(l.date).getTime() > Date.now() - 604800000
    );

    const stats = [
      { label: "Sessions", value: clientLogs.length },
      { label: "Total Mins", value: client.totalMinutes },
      { label: "Programs", value: clientAssignments.length },
      { label: "This Week", value: thisWeekLogs.length },
    ];

    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
          <ArrowLeft className="size-4 mr-1.5" /> All Clients
        </Button>

        <h2 className="text-xl font-semibold tracking-tight">{client.name}&apos;s Progress</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {Object.keys(exerciseProgress).length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="size-4" /> Strength Progress
            </h3>
            <div className="space-y-2">
              {Object.entries(exerciseProgress)
                .slice(0, 6)
                .map(([name, data]: [string, { name: string; entries: { date: Date; weight: number }[] }]) => {
                  const entries = data.entries.sort(
                    (a: { date: Date; weight: number }, b: { date: Date; weight: number }) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  const first = entries[0]?.weight || 0;
                  const last = entries[entries.length - 1]?.weight || 0;
                  const change = last - first;

                  return (
                    <Card key={name}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-medium text-sm">{name}</p>
                          <span
                            className={cn(
                              "text-sm tabular-nums font-medium",
                              change > 0
                                ? "text-success"
                                : change < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            {change > 0 ? "+" : ""}
                            {change} lbs
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          {first} → {last} lbs ({entries.length} sessions)
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const sortedClients = [...clientStats].sort(
    (a: ClientStat, b: ClientStat) => b.recentLogs - a.recentLogs
  );

  return (
    <div className="space-y-2">
      {sortedClients.map((c: ClientStat) => (
        <div
          key={c.id}
          onClick={() => setSelectedClient(c.id)}
          className="flex items-center justify-between rounded-lg border bg-card p-4 cursor-pointer transition-colors hover:bg-accent"
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
                "size-2.5 rounded-full",
                c.recentLogs >= 3
                  ? "bg-success"
                  : c.recentLogs > 0
                  ? "bg-warning"
                  : "bg-destructive"
              )}
            />
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </div>
      ))}
    </div>
  );
}
