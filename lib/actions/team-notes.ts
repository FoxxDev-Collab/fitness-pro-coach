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

export async function getTeamNotes(teamId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeTeamId = validateId(teamId, "team id");

  const team = await db.team.findFirst({
    where: { id: safeTeamId, coachId: session.user.id },
  });
  if (!team) throw new Error("Team not found");

  return db.teamNote.findMany({
    where: { teamId: safeTeamId },
    include: { coach: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createTeamNote(
  teamId: string,
  content: string,
  category: NoteCategory = "GENERAL",
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeTeamId = validateId(teamId, "team id");
  const safeContent = validateContent(content);
  const safeCategory = validateCategory(category) ?? "GENERAL";

  const team = await db.team.findFirst({
    where: { id: safeTeamId, coachId: session.user.id },
  });
  if (!team) throw new Error("Team not found");

  await db.teamNote.create({
    data: { teamId: safeTeamId, coachId: session.user.id, content: safeContent, category: safeCategory },
  });

  revalidatePath(`/teams/${safeTeamId}`);
}

export async function updateTeamNote(
  noteId: string,
  content: string,
  category?: NoteCategory,
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");
  const safeContent = validateContent(content);
  const safeCategory = validateCategory(category);

  const note = await db.teamNote.findUnique({ where: { id: safeNoteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.teamNote.update({
    where: { id: safeNoteId },
    data: { content: safeContent, ...(safeCategory && { category: safeCategory }) },
  });

  revalidatePath(`/teams/${note.teamId}`);
}

export async function deleteTeamNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");

  const note = await db.teamNote.findUnique({ where: { id: safeNoteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.teamNote.delete({ where: { id: safeNoteId } });
  revalidatePath(`/teams/${note.teamId}`);
}

export async function togglePinTeamNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");

  const note = await db.teamNote.findUnique({ where: { id: safeNoteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.teamNote.update({
    where: { id: safeNoteId },
    data: { pinned: !note.pinned },
  });

  revalidatePath(`/teams/${note.teamId}`);
}
