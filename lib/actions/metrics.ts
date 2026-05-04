"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { cuid, parseInput } from "@/lib/validations";
import {
  createMetricDefinitionSchema,
  updateMetricDefinitionSchema,
  recordMetricEntrySchema,
  updateMetricEntrySchema,
  type CreateMetricDefinitionInput,
  type UpdateMetricDefinitionInput,
  type RecordMetricEntryInput,
  type UpdateMetricEntryInput,
} from "@/lib/validations/metrics";

function validateId(id: unknown, label: string): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error(`Invalid ${label}`);
  return parsed.data;
}

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

export async function createMetricDefinition(input: CreateMetricDefinitionInput) {
  const parsed = parseInput(createMetricDefinitionSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  const metric = await db.metricDefinition.create({
    data: { ...parsed.data, coachId },
  });
  revalidatePath("/teams");
  return metric;
}

export async function updateMetricDefinition(id: string, input: UpdateMetricDefinitionInput) {
  const safeId = validateId(id, "metric id");
  const parsed = parseInput(updateMetricDefinitionSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  const metric = await db.metricDefinition.findFirst({ where: { id: safeId, coachId } });
  if (!metric) throw new Error("Metric not found");

  const updated = await db.metricDefinition.update({ where: { id: safeId }, data: parsed.data });
  revalidatePath("/teams");
  return updated;
}

export async function archiveMetricDefinition(id: string) {
  const safeId = validateId(id, "metric id");
  const coachId = await getCoachId();
  const metric = await db.metricDefinition.findFirst({ where: { id: safeId, coachId } });
  if (!metric) throw new Error("Metric not found");

  await db.metricDefinition.update({
    where: { id: safeId },
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
  // Validate any IDs that were passed
  const where: {
    metricDefinitionId?: string;
    teamId?: string;
    athleteId?: string;
    eventId?: string;
    metricDefinition: { coachId: string };
  } = { metricDefinition: { coachId } };
  if (params.metricDefinitionId !== undefined) {
    where.metricDefinitionId = validateId(params.metricDefinitionId, "metric id");
  }
  if (params.teamId !== undefined) where.teamId = validateId(params.teamId, "team id");
  if (params.athleteId !== undefined) where.athleteId = validateId(params.athleteId, "athlete id");
  if (params.eventId !== undefined) where.eventId = validateId(params.eventId, "event id");

  return db.metricEntry.findMany({
    where,
    include: {
      metricDefinition: true,
      athlete: { select: { id: true, name: true } },
      event: { select: { id: true, title: true, type: true, startTime: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function recordMetricEntry(input: RecordMetricEntryInput) {
  const parsed = parseInput(recordMetricEntrySchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const data = parsed.data;

  const coachId = await getCoachId();

  // Verify metric ownership
  const metric = await db.metricDefinition.findFirst({
    where: { id: data.metricDefinitionId, coachId },
  });
  if (!metric) throw new Error("Metric not found");

  // Verify scope
  if (metric.scope === "TEAM" && !data.teamId) throw new Error("Team ID required for team metric");
  if (metric.scope === "ATHLETE" && !data.athleteId) throw new Error("Athlete ID required for athlete metric");

  // Verify ownership of the team/athlete being measured
  if (data.teamId) {
    const team = await db.team.findFirst({ where: { id: data.teamId, coachId } });
    if (!team) throw new Error("Team not found");
  }
  if (data.athleteId) {
    const athlete = await db.athlete.findFirst({
      where: { id: data.athleteId, team: { coachId } },
    });
    if (!athlete) throw new Error("Athlete not found");
  }
  if (data.eventId) {
    const event = await db.teamEvent.findFirst({
      where: { id: data.eventId, team: { coachId } },
    });
    if (!event) throw new Error("Event not found");
  }

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

export async function updateMetricEntry(id: string, input: UpdateMetricEntryInput) {
  const safeId = validateId(id, "metric entry id");
  const parsed = parseInput(updateMetricEntrySchema, input);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  const entry = await db.metricEntry.findUnique({
    where: { id: safeId },
    include: { metricDefinition: { select: { coachId: true } } },
  });
  if (!entry || entry.metricDefinition.coachId !== coachId) throw new Error("Not found");

  await db.metricEntry.update({ where: { id: safeId }, data: parsed.data });

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
  const safeId = validateId(id, "metric entry id");
  const coachId = await getCoachId();
  const entry = await db.metricEntry.findUnique({
    where: { id: safeId },
    include: { metricDefinition: { select: { coachId: true } } },
  });
  if (!entry || entry.metricDefinition.coachId !== coachId) throw new Error("Not found");

  await db.metricEntry.delete({ where: { id: safeId } });

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
  const safeTeamId = validateId(teamId, "team id");
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: safeTeamId, coachId } });
  if (!team) throw new Error("Team not found");

  const definitions = await db.metricDefinition.findMany({
    where: { coachId, scope: "TEAM", archived: false },
  });

  const summaries = await Promise.all(
    definitions.map(async (def) => {
      const entries = await db.metricEntry.findMany({
        where: { metricDefinitionId: def.id, teamId: safeTeamId },
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
    }),
  );

  return summaries;
}

export async function getAthleteMetricSummary(athleteId: string) {
  const safeAthleteId = validateId(athleteId, "athlete id");
  const coachId = await getCoachId();

  // Verify ownership
  const athlete = await db.athlete.findFirst({
    where: { id: safeAthleteId, team: { coachId } },
  });
  if (!athlete) throw new Error("Athlete not found");

  const definitions = await db.metricDefinition.findMany({
    where: { coachId, scope: "ATHLETE", archived: false },
  });

  const summaries = await Promise.all(
    definitions.map(async (def) => {
      const entries = await db.metricEntry.findMany({
        where: { metricDefinitionId: def.id, athleteId: safeAthleteId },
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
    }),
  );

  return summaries;
}
