"use server";

import { db } from "@/lib/db";
import { getCoachId } from "@/lib/auth-utils";

export type ClientAdherence = {
  id: string;
  name: string;
  active: boolean;
  assignmentCount: number;
  lastSessionDate: Date | null;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  streak: number; // consecutive weeks with at least 1 session
};

export type AdherenceSummary = {
  totalActive: number;
  activeThisWeek: number;
  avgSessionsPerWeek: number;
  clients: ClientAdherence[];
};

export async function getAdherenceDashboard(): Promise<AdherenceSummary> {
  const coachId = await getCoachId();

  const clients = await db.client.findMany({
    where: { coachId },
    include: {
      assignments: {
        include: {
          logs: {
            select: { date: true },
            orderBy: { date: "desc" },
          },
        },
      },
    },
  });

  const now = Date.now();
  const oneWeek = 7 * 86400000;
  const oneMonth = 30 * 86400000;

  const clientStats: ClientAdherence[] = clients.map((c) => {
    const allLogs = c.assignments.flatMap((a) => a.logs);
    const dates = allLogs.map((l) => new Date(l.date).getTime());

    const lastSessionDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;
    const sessionsThisWeek = dates.filter((d) => now - d < oneWeek).length;
    const sessionsThisMonth = dates.filter((d) => now - d < oneMonth).length;

    // Calculate streak: consecutive weeks (from current week backwards) with at least 1 session
    let streak = 0;
    if (dates.length > 0) {
      const weekStart = (t: number) => {
        const d = new Date(t);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        return d.getTime();
      };

      const currentWeekStart = weekStart(now);
      const sessionWeeks = new Set(dates.map((d) => weekStart(d)));

      // Check from current week backward
      for (let w = 0; w < 52; w++) {
        const ws = currentWeekStart - w * 7 * 86400000;
        if (sessionWeeks.has(ws)) {
          streak++;
        } else if (w > 0) {
          // Allow current week to be empty (week in progress)
          break;
        }
      }
    }

    return {
      id: c.id,
      name: c.name,
      active: c.active,
      assignmentCount: c.assignments.length,
      lastSessionDate,
      sessionsThisWeek,
      sessionsThisMonth,
      streak,
    };
  });

  // Sort: least active first (risk-based)
  clientStats.sort((a, b) => {
    if (!a.lastSessionDate && b.lastSessionDate) return -1;
    if (a.lastSessionDate && !b.lastSessionDate) return 1;
    if (!a.lastSessionDate && !b.lastSessionDate) return 0;
    return a.lastSessionDate!.getTime() - b.lastSessionDate!.getTime();
  });

  const totalActive = clientStats.filter((c) => c.active).length;
  const activeThisWeek = clientStats.filter((c) => c.sessionsThisWeek > 0).length;

  // Avg sessions per week across all clients over last 4 weeks
  const fourWeeksAgo = now - 4 * oneWeek;
  const totalSessionsLast4Weeks = clients
    .flatMap((c) => c.assignments.flatMap((a) => a.logs))
    .filter((l) => new Date(l.date).getTime() > fourWeeksAgo).length;
  const avgSessionsPerWeek =
    totalActive > 0 ? Math.round((totalSessionsLast4Weeks / 4) * 10) / 10 : 0;

  return {
    totalActive,
    activeThisWeek,
    avgSessionsPerWeek,
    clients: clientStats,
  };
}
