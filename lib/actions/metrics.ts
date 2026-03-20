"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { MetricScope } from "@prisma/client";

// ─── Metric Definitions ────────────────────────────────────

export async function getMetricDefinitions() {
  const coachId = await getCoachId();
  return db.metricDefinition.findMany({
    where: { coachId, archived: false },
    orderBy: [{ scope: "asc" }, { name: "asc" }],
  });
}

export async function getAllMetricDefinitions() {
  const coachId = await getCoachId();
  return db.metricDefinition.findMany({
    where: { coachId },
    orderBy: [{ scope: "asc" }, { name: "asc" }],
  });
}

export async function createMetricDefinition(data: {
  name: string;
  unit: string;
  scope: MetricScope;
  description?: string;
}) {
  const coachId = await getCoachId();
  const metric = await db.metricDefinition.create({
    data: { ...data, coachId },
  });
  revalidatePath("/teams");
  return metric;
}

export async function updateMetricDefinition(
  id: string,
  data: { name?: string; unit?: string; description?: string }
) {
  const coachId = await getCoachId();
  const metric = await db.metricDefinition.findFirst({ where: { id, coachId } });
  if (!metric) throw new Error("Metric not found");

  const updated = await db.metricDefinition.update({ where: { id }, data });
  revalidatePath("/teams");
  return updated;
}

export async function archiveMetricDefinition(id: string) {
  const coachId = await getCoachId();
  const metric = await db.metricDefinition.findFirst({ where: { id, coachId } });
  if (!metric) throw new Error("Metric not found");

  await db.metricDefinition.update({
    where: { id },
    data: { archived: !metric.archived },
  });
  revalidatePath("/teams");
}

// ─── Metric Entries ────────────────────────────────────────

export async function getMetricEntries(params: {
  metricDefinitionId?: string;
  teamId?: string;
  athleteId?: string;
  eventId?: string;
}) {
  const coachId = await getCoachId();
  return db.metricEntry.findMany({
    where: {
      ...params,
      metricDefinition: { coachId },
    },
    include: {
      metricDefinition: true,
      athlete: { select: { id: true, name: true } },
      event: { select: { id: true, title: true, type: true, startTime: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function recordMetricEntry(data: {
  metricDefinitionId: string;
  teamId?: string;
  athleteId?: string;
  eventId?: string;
  value: number;
  notes?: string;
  date: Date;
}) {
  const coachId = await getCoachId();

  // Verify ownership
  const metric = await db.metricDefinition.findFirst({
    where: { id: data.metricDefinitionId, coachId },
  });
  if (!metric) throw new Error("Metric not found");

  // Verify scope
  if (metric.scope === "TEAM" && !data.teamId) throw new Error("Team ID required for team metric");
  if (metric.scope === "ATHLETE" && !data.athleteId) throw new Error("Athlete ID required for athlete metric");

  const entry = await db.metricEntry.create({ data });

  if (data.teamId) revalidatePath(`/teams/${data.teamId}`);
  if (data.athleteId) {
    const athlete = await db.athlete.findUnique({
      where: { id: data.athleteId },
      select: { teamId: true },
    });
    if (athlete) revalidatePath(`/teams/${athlete.teamId}`);
  }

  return entry;
}

export async function updateMetricEntry(
  id: string,
  data: { value?: number; notes?: string; date?: Date; eventId?: string }
) {
  const coachId = await getCoachId();
  const entry = await db.metricEntry.findUnique({
    where: { id },
    include: { metricDefinition: { select: { coachId: true } } },
  });
  if (!entry || entry.metricDefinition.coachId !== coachId) throw new Error("Not found");

  await db.metricEntry.update({ where: { id }, data });

  if (entry.teamId) revalidatePath(`/teams/${entry.teamId}`);
  if (entry.athleteId) {
    const athlete = await db.athlete.findUnique({
      where: { id: entry.athleteId },
      select: { teamId: true },
    });
    if (athlete) revalidatePath(`/teams/${athlete.teamId}`);
  }
}

export async function deleteMetricEntry(id: string) {
  const coachId = await getCoachId();
  const entry = await db.metricEntry.findUnique({
    where: { id },
    include: { metricDefinition: { select: { coachId: true } } },
  });
  if (!entry || entry.metricDefinition.coachId !== coachId) throw new Error("Not found");

  await db.metricEntry.delete({ where: { id } });

  if (entry.teamId) revalidatePath(`/teams/${entry.teamId}`);
  if (entry.athleteId) {
    const athlete = await db.athlete.findUnique({
      where: { id: entry.athleteId },
      select: { teamId: true },
    });
    if (athlete) revalidatePath(`/teams/${athlete.teamId}`);
  }
}

// ─── Summaries ─────────────────────────────────────────────

export async function getTeamMetricSummary(teamId: string) {
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: teamId, coachId } });
  if (!team) throw new Error("Team not found");

  const definitions = await db.metricDefinition.findMany({
    where: { coachId, scope: "TEAM", archived: false },
  });

  const summaries = await Promise.all(
    definitions.map(async (def) => {
      const entries = await db.metricEntry.findMany({
        where: { metricDefinitionId: def.id, teamId },
        orderBy: { date: "asc" },
        include: { event: { select: { title: true, startTime: true } } },
      });
      const latest = entries[entries.length - 1];
      const previous = entries.length >= 2 ? entries[entries.length - 2] : null;
      return {
        definition: def,
        entries,
        latest: latest?.value ?? null,
        previous: previous?.value ?? null,
        total: entries.reduce((sum, e) => sum + e.value, 0),
        count: entries.length,
      };
    })
  );

  return summaries;
}

export async function getAthleteMetricSummary(athleteId: string) {
  const coachId = await getCoachId();

  const definitions = await db.metricDefinition.findMany({
    where: { coachId, scope: "ATHLETE", archived: false },
  });

  const summaries = await Promise.all(
    definitions.map(async (def) => {
      const entries = await db.metricEntry.findMany({
        where: { metricDefinitionId: def.id, athleteId },
        orderBy: { date: "asc" },
        include: { event: { select: { title: true, startTime: true } } },
      });
      const latest = entries[entries.length - 1];
      const previous = entries.length >= 2 ? entries[entries.length - 2] : null;
      const best = entries.length > 0
        ? entries.reduce((best, e) => (e.value > best.value ? e : best))
        : null;
      return {
        definition: def,
        entries,
        latest: latest?.value ?? null,
        previous: previous?.value ?? null,
        best: best?.value ?? null,
        count: entries.length,
      };
    })
  );

  return summaries.filter((s) => s.count > 0 || true); // return all, even empty
}
