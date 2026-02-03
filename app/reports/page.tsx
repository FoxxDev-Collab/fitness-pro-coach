import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReportsClientView } from "./reports-client";

export default async function ReportsPage() {
  const [clients, assignments, logs] = await Promise.all([
    db.client.findMany({
      orderBy: { name: "asc" },
    }),
    db.assignment.findMany({
      include: {
        workouts: {
          include: {
            exercises: true,
          },
        },
      },
    }),
    db.sessionLog.findMany({
      include: {
        exercises: {
          include: {
            setDetails: true,
          },
        },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  // Calculate stats for each client
  const clientStats = clients.map((c) => {
    const clientAssignments = assignments.filter((a) => a.clientId === c.id);
    const clientLogs = logs.filter((l) =>
      clientAssignments.some((a) => a.id === l.assignmentId)
    );
    const recentLogs = clientLogs.filter(
      (l) => new Date(l.date).getTime() > Date.now() - 604800000
    );

    return {
      ...c,
      totalLogs: clientLogs.length,
      recentLogs: recentLogs.length,
      totalMinutes: clientLogs.reduce((sum, l) => sum + (l.duration || 0), 0),
    };
  });

  const activeClients = clients.filter((c) => c.active).length;
  const totalSessions = logs.length;
  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
  const thisWeekSessions = logs.filter(
    (l) => new Date(l.date).getTime() > Date.now() - 604800000
  ).length;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Reports</h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-400">{activeClients}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{totalSessions}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="bg-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{totalMinutes}</p>
          <p className="text-xs text-muted-foreground">Total Mins</p>
        </div>
        <div className="bg-card rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{thisWeekSessions}</p>
          <p className="text-xs text-muted-foreground">This Week</p>
        </div>
      </div>

      {/* Client List */}
      {clients.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Add clients to see reports
        </p>
      ) : (
        <ReportsClientView clientStats={clientStats} assignments={assignments} logs={logs} />
      )}
    </div>
  );
}
