"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { NoteCategory } from "@prisma/client";

async function verifyAthleteOwnership(athleteId: string, coachId: string) {
  const athlete = await db.athlete.findUnique({
    where: { id: athleteId },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!athlete || athlete.team.coachId !== coachId) throw new Error("Not authorized");
  return athlete;
}

export async function getAthleteNotes(athleteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  await verifyAthleteOwnership(athleteId, session.user.id);

  return db.athleteNote.findMany({
    where: { athleteId },
    include: { coach: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAthleteNote(
  athleteId: string,
  content: string,
  category: NoteCategory = "GENERAL"
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const athlete = await verifyAthleteOwnership(athleteId, session.user.id);

  await db.athleteNote.create({
    data: { athleteId, coachId: session.user.id, content, category },
  });

  revalidatePath(`/teams/${athlete.team.id}`);
}

export async function updateAthleteNote(
  noteId: string,
  content: string,
  category?: NoteCategory
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const note = await db.athleteNote.findUnique({
    where: { id: noteId },
    include: { athlete: { select: { teamId: true } } },
  });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.athleteNote.update({
    where: { id: noteId },
    data: { content, ...(category && { category }) },
  });

  revalidatePath(`/teams/${note.athlete.teamId}`);
}

export async function deleteAthleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const note = await db.athleteNote.findUnique({
    where: { id: noteId },
    include: { athlete: { select: { teamId: true } } },
  });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.athleteNote.delete({ where: { id: noteId } });
  revalidatePath(`/teams/${note.athlete.teamId}`);
}

export async function togglePinAthleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const note = await db.athleteNote.findUnique({
    where: { id: noteId },
    include: { athlete: { select: { teamId: true } } },
  });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.athleteNote.update({
    where: { id: noteId },
    data: { pinned: !note.pinned },
  });

  revalidatePath(`/teams/${note.athlete.teamId}`);
}
