"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { cuid, parseInput } from "@/lib/validations";
import {
  disciplineSchema,
  saveMeetResultsSchema,
  setOpponentScoresSchema,
  type DisciplineInput,
  type OpponentScoreInput,
  type SaveMeetResultsInput,
} from "@/lib/validations/results";

// After unification, a "discipline" is simply a MetricDefinition with a
// `direction` set, and a "race result" is a MetricEntry tied to a TeamEvent.
// These actions keep their original names + return shapes so the results UI and
// the pure engine (lib/results/*) don't have to change.

function validateId(id: unknown, label: string): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error(`Invalid ${label}`);
  return parsed.data;
}

const XC_DEFAULTS = [
  { name: "5K", distanceMeters: 5000 },
  { name: "3200m", distanceMeters: 3200 },
  { name: "2 Mile", distanceMeters: 3218 },
];

type UnitType = "TIME" | "DISTANCE" | "WEIGHT" | "POINTS";
type Direction = "LOWER_BETTER" | "HIGHER_BETTER";

function toDisciplineDTO(d: {
  id: string;
  name: string;
  unitType: string;
  direction: string | null;
  distanceMeters: number | null;
}) {
  return {
    id: d.id,
    name: d.name,
    unitType: d.unitType as UnitType,
    direction: (d.direction ?? "LOWER_BETTER") as Direction,
    distanceMeters: d.distanceMeters,
  };
}

// ─── Disciplines (MetricDefinitions with a direction) ──────

export async function ensureDefaultDisciplines() {
  const coachId = await getCoachId();
  const count = await db.metricDefinition.count({
    where: { coachId, direction: { not: null } },
  });
  if (count > 0) return;
  await db.metricDefinition.createMany({
    data: XC_DEFAULTS.map((d) => ({
      coachId,
      name: d.name,
      unit: "time",
      scope: "ATHLETE" as const,
      unitType: "TIME" as const,
      direction: "LOWER_BETTER" as const,
      distanceMeters: d.distanceMeters,
    })),
  });
}

export async function getDisciplines() {
  const coachId = await getCoachId();
  const rows = await db.metricDefinition.findMany({
    where: { coachId, archived: false, direction: { not: null } },
    orderBy: [{ distanceMeters: "asc" }, { name: "asc" }],
  });
  return rows.map(toDisciplineDTO);
}

export async function createDiscipline(input: DisciplineInput) {
  const coachId = await getCoachId();
  const parsed = parseInput(disciplineSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const d = parsed.data;
  return db.metricDefinition.create({
    data: {
      coachId,
      name: d.name,
      unit: d.unitType.toLowerCase(),
      scope: "ATHLETE",
      unitType: d.unitType,
      direction: d.direction,
      distanceMeters: d.distanceMeters ?? null,
    },
  });
}

export async function updateDiscipline(id: string, input: DisciplineInput) {
  const safeId = validateId(id, "discipline id");
  const coachId = await getCoachId();
  const parsed = parseInput(disciplineSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const existing = await db.metricDefinition.findFirst({ where: { id: safeId, coachId } });
  if (!existing) throw new Error("Discipline not found");
  const d = parsed.data;
  return db.metricDefinition.update({
    where: { id: safeId },
    data: {
      name: d.name,
      unitType: d.unitType,
      direction: d.direction,
      distanceMeters: d.distanceMeters ?? null,
    },
  });
}

export async function archiveDiscipline(id: string) {
  const safeId = validateId(id, "discipline id");
  const coachId = await getCoachId();
  const existing = await db.metricDefinition.findFirst({ where: { id: safeId, coachId } });
  if (!existing) throw new Error("Discipline not found");
  return db.metricDefinition.update({ where: { id: safeId }, data: { archived: true } });
}

// ─── Meets & results (MetricEntries tied to a TeamEvent) ───

async function assertEventOwned(eventId: string) {
  const coachId = await getCoachId();
  const event = await db.teamEvent.findUnique({
    where: { id: eventId },
    include: { team: { select: { id: true, coachId: true } } },
  });
  if (!event) throw new Error("Event not found");
  if (event.team.coachId !== coachId) throw new Error("Not authorized");
  return event;
}

export async function getMeetResults(eventId: string) {
  const safeId = validateId(eventId, "event id");
  const event = await assertEventOwned(safeId);
  const [roster, entries] = await Promise.all([
    db.athlete.findMany({
      where: { teamId: event.team.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, gender: true },
    }),
    db.metricEntry.findMany({
      where: { eventId: safeId, metricDefinition: { direction: { not: null } } },
      include: { splits: { orderBy: { order: "asc" } } },
    }),
  ]);
  const results = entries
    .filter((r) => r.athleteId)
    .map((r) => ({
      athleteId: r.athleteId as string,
      disciplineId: r.metricDefinitionId,
      value: r.value,
      place: r.place,
      squad: r.squad,
      dnf: r.status !== "FINISHED",
      splits: r.splits.map((s) => ({ value: s.value })),
    }));
  return { event, roster, results };
}

export async function saveMeetResults(eventId: string, input: SaveMeetResultsInput) {
  const safeId = validateId(eventId, "event id");
  const event = await assertEventOwned(safeId);
  const coachId = event.team.coachId;
  const parsed = parseInput(saveMeetResultsSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);

  const rowsToWrite = parsed.data.rows.filter((r) => r.dnf || r.value != null);

  // Authorization: every athlete must belong to THIS team and every discipline
  // (metric with a direction) to THIS coach — otherwise a crafted payload could
  // attach results to another coach's athlete/metric (IDOR via unvalidated FKs).
  const athleteIds = [...new Set(rowsToWrite.map((r) => r.athleteId))];
  const disciplineIds = [...new Set(rowsToWrite.map((r) => r.disciplineId))];
  if (athleteIds.length > 0) {
    const found = await db.athlete.findMany({
      where: { id: { in: athleteIds }, teamId: event.team.id },
      select: { id: true },
    });
    if (found.length !== athleteIds.length) throw new Error("Invalid athlete");
  }
  if (disciplineIds.length > 0) {
    const found = await db.metricDefinition.findMany({
      where: { id: { in: disciplineIds }, coachId, direction: { not: null } },
      select: { id: true },
    });
    if (found.length !== disciplineIds.length) throw new Error("Invalid discipline");
  }

  for (const row of rowsToWrite) {
    const data = {
      value: row.value ?? 0,
      place: row.place ?? null,
      squad: row.squad ?? null,
      status: (row.dnf ? "DNF" : "FINISHED") as "DNF" | "FINISHED",
      notes: row.notes ?? null,
      date: event.startTime,
    };
    const entry = await db.metricEntry.upsert({
      where: {
        eventId_athleteId_metricDefinitionId: {
          eventId: safeId,
          athleteId: row.athleteId,
          metricDefinitionId: row.disciplineId,
        },
      },
      create: {
        eventId: safeId,
        athleteId: row.athleteId,
        metricDefinitionId: row.disciplineId,
        ...data,
      },
      update: data,
    });
    await db.split.deleteMany({ where: { metricEntryId: entry.id } });
    if (row.splits && row.splits.length > 0) {
      await db.split.createMany({
        data: row.splits.map((s) => ({
          metricEntryId: entry.id,
          order: s.order,
          label: s.label ?? null,
          value: s.value,
        })),
      });
    }
  }
  revalidatePath(`/teams/${event.team.id}`);
}

export async function deleteResult(id: string) {
  const safeId = validateId(id, "result id");
  const coachId = await getCoachId();
  const entry = await db.metricEntry.findUnique({
    where: { id: safeId },
    include: {
      metricDefinition: { select: { coachId: true } },
      event: { select: { teamId: true } },
    },
  });
  if (!entry || entry.metricDefinition.coachId !== coachId) throw new Error("Not authorized");
  await db.metricEntry.delete({ where: { id: safeId } });
  if (entry.event?.teamId) revalidatePath(`/teams/${entry.event.teamId}`);
}

export async function setMeetOpponentScores(
  eventId: string,
  input: { entries: OpponentScoreInput[] },
) {
  const safeId = validateId(eventId, "event id");
  const event = await assertEventOwned(safeId);
  const parsed = parseInput(setOpponentScoresSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  await db.meetOpponentScore.deleteMany({ where: { eventId: safeId } });
  if (parsed.data.entries.length > 0) {
    await db.meetOpponentScore.createMany({
      data: parsed.data.entries.map((e) => ({ eventId: safeId, ...e })),
    });
  }
  revalidatePath(`/teams/${event.team.id}`);
}

// ─── Reads for the Results tab ─────────────────────────────

export async function getTeamResultsOverview(teamId: string) {
  const safeId = validateId(teamId, "team id");
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: safeId, coachId } });
  if (!team) throw new Error("Team not found");

  const [disciplineRows, entryRows, meets, opponentScores] = await Promise.all([
    db.metricDefinition.findMany({
      where: { coachId, archived: false, direction: { not: null } },
      orderBy: [{ distanceMeters: "asc" }, { name: "asc" }],
    }),
    db.metricEntry.findMany({
      where: {
        eventId: { not: null },
        athlete: { teamId: safeId },
        metricDefinition: { direction: { not: null } },
      },
      include: {
        event: { select: { id: true, title: true, startTime: true, type: true } },
        athlete: { select: { id: true, name: true, gender: true } },
        metricDefinition: { select: { id: true, name: true, unitType: true, direction: true } },
        splits: { orderBy: { order: "asc" } },
      },
    }),
    db.teamEvent.findMany({
      where: { teamId: safeId, type: { in: ["MEET", "GAME"] } },
      orderBy: { startTime: "desc" },
      select: { id: true, title: true, startTime: true, type: true },
    }),
    db.meetOpponentScore.findMany({ where: { event: { teamId: safeId } } }),
  ]);

  const disciplines = disciplineRows.map(toDisciplineDTO);
  const rows = entryRows
    .filter((r) => r.athlete && r.event && r.eventId)
    .map((r) => ({
      id: r.id,
      athleteId: r.athleteId as string,
      disciplineId: r.metricDefinitionId,
      eventId: r.eventId as string,
      value: r.value,
      place: r.place,
      squad: r.squad,
      dnf: r.status !== "FINISHED",
      event: r.event!,
      athlete: r.athlete!,
      discipline: {
        id: r.metricDefinition.id,
        name: r.metricDefinition.name,
        unitType: r.metricDefinition.unitType as UnitType,
        direction: (r.metricDefinition.direction ?? "LOWER_BETTER") as Direction,
      },
      splits: r.splits.map((s) => ({ order: s.order, label: s.label, value: s.value })),
    }));

  return { disciplines, rows, meets, opponentScores };
}

export async function getAthleteRaces(athleteId: string) {
  const safeId = validateId(athleteId, "athlete id");
  const coachId = await getCoachId();
  const athlete = await db.athlete.findFirst({
    where: { id: safeId, team: { coachId } },
    select: { id: true, name: true, gender: true },
  });
  if (!athlete) throw new Error("Athlete not found");

  const entryRows = await db.metricEntry.findMany({
    where: {
      athleteId: safeId,
      eventId: { not: null },
      metricDefinition: { direction: { not: null } },
    },
    include: {
      event: { select: { id: true, title: true, startTime: true, type: true } },
      metricDefinition: { select: { id: true, name: true, unitType: true, direction: true } },
      splits: { orderBy: { order: "asc" } },
    },
    orderBy: { event: { startTime: "asc" } },
  });

  return entryRows
    .filter((r) => r.event && r.eventId)
    .map((r) => ({
      id: r.id,
      athleteId: r.athleteId as string,
      disciplineId: r.metricDefinitionId,
      eventId: r.eventId as string,
      value: r.value,
      place: r.place,
      squad: r.squad,
      dnf: r.status !== "FINISHED",
      event: r.event!,
      athlete: { id: athlete.id, name: athlete.name, gender: athlete.gender },
      discipline: {
        id: r.metricDefinition.id,
        name: r.metricDefinition.name,
        unitType: r.metricDefinition.unitType as UnitType,
        direction: (r.metricDefinition.direction ?? "LOWER_BETTER") as Direction,
      },
      splits: r.splits.map((s) => ({ order: s.order, label: s.label, value: s.value })),
    }));
}
