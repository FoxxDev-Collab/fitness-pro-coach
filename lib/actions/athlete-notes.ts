"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { NoteCategory } from "@prisma/client";
import { cuid } from "@/lib/validations";
import { noteContent, noteCategorySchema } from "@/lib/validations/notes";

function validateId(id: unknown, label: string): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error(`Invalid ${label}`);
  return parsed.data;
}

function validateContent(content: unknown): string {
  const parsed = noteContent.safeParse(content);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid content");
  return parsed.data;
}

function validateCategory(category: unknown): NoteCategory | undefined {
  if (category === undefined) return undefined;
  const parsed = noteCategorySchema.safeParse(category);
  if (!parsed.success) throw new Error("Invalid category");
  return parsed.data;
}

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

  const safeId = validateId(athleteId, "athlete id");
  await verifyAthleteOwnership(safeId, session.user.id);

  return db.athleteNote.findMany({
    where: { athleteId: safeId },
    include: { coach: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createAthleteNote(
  athleteId: string,
  content: string,
  category: NoteCategory = "GENERAL",
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeId = validateId(athleteId, "athlete id");
  const safeContent = validateContent(content);
  const safeCategory = validateCategory(category) ?? "GENERAL";

  const athlete = await verifyAthleteOwnership(safeId, session.user.id);

  await db.athleteNote.create({
    data: { athleteId: safeId, coachId: session.user.id, content: safeContent, category: safeCategory },
  });

  revalidatePath(`/teams/${athlete.team.id}`);
}

export async function updateAthleteNote(
  noteId: string,
  content: string,
  category?: NoteCategory,
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");
  const safeContent = validateContent(content);
  const safeCategory = validateCategory(category);

  const note = await db.athleteNote.findUnique({
    where: { id: safeNoteId },
    include: { athlete: { select: { teamId: true } } },
  });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.athleteNote.update({
    where: { id: safeNoteId },
    data: { content: safeContent, ...(safeCategory && { category: safeCategory }) },
  });

  revalidatePath(`/teams/${note.athlete.teamId}`);
}

export async function deleteAthleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");

  const note = await db.athleteNote.findUnique({
    where: { id: safeNoteId },
    include: { athlete: { select: { teamId: true } } },
  });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.athleteNote.delete({ where: { id: safeNoteId } });
  revalidatePath(`/teams/${note.athlete.teamId}`);
}

export async function togglePinAthleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");

  const note = await db.athleteNote.findUnique({
    where: { id: safeNoteId },
    include: { athlete: { select: { teamId: true } } },
  });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.athleteNote.update({
    where: { id: safeNoteId },
    data: { pinned: !note.pinned },
  });

  revalidatePath(`/teams/${note.athlete.teamId}`);
}
