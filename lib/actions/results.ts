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
  type SaveMeetResultsInput,
  type OpponentScoreInput,
} from "@/lib/validations/results";

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

// ─── Disciplines ───────────────────────────────────────────

export async function ensureDefaultDisciplines() {
  const coachId = await getCoachId();
  const count = await db.discipline.count({ where: { coachId } });
  if (count > 0) return;
  await db.discipline.createMany({
    data: XC_DEFAULTS.map((d) => ({
      coachId,
      name: d.name,
      distanceMeters: d.distanceMeters,
      unitType: "TIME" as const,
      direction: "LOWER_BETTER" as const,
    })),
  });
}

export async function getDisciplines() {
  const coachId = await getCoachId();
  return db.discipline.findMany({
    where: { coachId, archived: false },
    orderBy: [{ distanceMeters: "asc" }, { name: "asc" }],
  });
}

export async function createDiscipline(input: DisciplineInput) {
  const coachId = await getCoachId();
  const parsed = parseInput(disciplineSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  return db.discipline.create({ data: { ...parsed.data, coachId } });
}

export async function updateDiscipline(id: string, input: DisciplineInput) {
  const safeId = validateId(id, "discipline id");
  const coachId = await getCoachId();
  const parsed = parseInput(disciplineSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const existing = await db.discipline.findFirst({ where: { id: safeId, coachId } });
  if (!existing) throw new Error("Discipline not found");
  return db.discipline.update({ where: { id: safeId }, data: parsed.data });
}

export async function archiveDiscipline(id: string) {
  const safeId = validateId(id, "discipline id");
  const coachId = await getCoachId();
  const existing = await db.discipline.findFirst({ where: { id: safeId, coachId } });
  if (!existing) throw new Error("Discipline not found");
  return db.discipline.update({ where: { id: safeId }, data: { archived: true } });
}

// ─── Meets & results ───────────────────────────────────────

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
  const [roster, results] = await Promise.all([
    db.athlete.findMany({
      where: { teamId: event.team.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, gender: true },
    }),
    db.raceResult.findMany({
      where: { eventId: safeId },
      include: { splits: { orderBy: { order: "asc" } } },
    }),
  ]);
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
  // to THIS coach — otherwise a crafted payload could attach results to another
  // coach's athlete/discipline (IDOR via unvalidated foreign keys).
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
    const found = await db.discipline.findMany({
      where: { id: { in: disciplineIds }, coachId },
      select: { id: true },
    });
    if (found.length !== disciplineIds.length) throw new Error("Invalid discipline");
  }

  for (const row of rowsToWrite) {
    const data = {
      value: row.value ?? 0,
      place: row.place ?? null,
      squad: row.squad ?? null,
      dnf: row.dnf,
      notes: row.notes ?? null,
    };
    const result = await db.raceResult.upsert({
      where: {
        eventId_athleteId_disciplineId: {
          eventId: safeId,
          athleteId: row.athleteId,
          disciplineId: row.disciplineId,
        },
      },
      create: {
        eventId: safeId,
        athleteId: row.athleteId,
        disciplineId: row.disciplineId,
        ...data,
      },
      update: data,
    });
    await db.split.deleteMany({ where: { resultId: result.id } });
    if (row.splits && row.splits.length > 0) {
      await db.split.createMany({
        data: row.splits.map((s) => ({
          resultId: result.id,
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
  const result = await db.raceResult.findUnique({
    where: { id: safeId },
    include: { event: { include: { team: { select: { id: true, coachId: true } } } } },
  });
  if (!result) throw new Error("Result not found");
  if (result.event.team.coachId !== coachId) throw new Error("Not authorized");
  await db.raceResult.delete({ where: { id: safeId } });
  revalidatePath(`/teams/${result.event.team.id}`);
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

  const [disciplines, rows, meets, opponentScores] = await Promise.all([
    db.discipline.findMany({
      where: { coachId, archived: false },
      orderBy: [{ distanceMeters: "asc" }, { name: "asc" }],
    }),
    db.raceResult.findMany({
      where: { athlete: { teamId: safeId } },
      include: {
        event: { select: { id: true, title: true, startTime: true, type: true } },
        athlete: { select: { id: true, name: true, gender: true } },
        discipline: {
          select: { id: true, name: true, unitType: true, direction: true },
        },
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

  return { disciplines, rows, meets, opponentScores };
}

export async function getAthleteRaces(athleteId: string) {
  const safeId = validateId(athleteId, "athlete id");
  const coachId = await getCoachId();
  const athlete = await db.athlete.findFirst({
    where: { id: safeId, team: { coachId } },
    select: { id: true },
  });
  if (!athlete) throw new Error("Athlete not found");
  return db.raceResult.findMany({
    where: { athleteId: safeId },
    include: {
      event: { select: { id: true, title: true, startTime: true } },
      discipline: {
        select: { id: true, name: true, unitType: true, direction: true },
      },
      splits: { orderBy: { order: "asc" } },
    },
    orderBy: { event: { startTime: "asc" } },
  });
}
