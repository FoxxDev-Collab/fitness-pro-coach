"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { NoteCategory } from "@prisma/client";

export async function getTeamNotes(teamId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const team = await db.team.findFirst({
    where: { id: teamId, coachId: session.user.id },
  });
  if (!team) throw new Error("Team not found");

  return db.teamNote.findMany({
    where: { teamId },
    include: { coach: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function createTeamNote(
  teamId: string,
  content: string,
  category: NoteCategory = "GENERAL"
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const team = await db.team.findFirst({
    where: { id: teamId, coachId: session.user.id },
  });
  if (!team) throw new Error("Team not found");

  await db.teamNote.create({
    data: { teamId, coachId: session.user.id, content, category },
  });

  revalidatePath(`/teams/${teamId}`);
}

export async function updateTeamNote(
  noteId: string,
  content: string,
  category?: NoteCategory
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const note = await db.teamNote.findUnique({ where: { id: noteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.teamNote.update({
    where: { id: noteId },
    data: { content, ...(category && { category }) },
  });

  revalidatePath(`/teams/${note.teamId}`);
}

export async function deleteTeamNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const note = await db.teamNote.findUnique({ where: { id: noteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.teamNote.delete({ where: { id: noteId } });
  revalidatePath(`/teams/${note.teamId}`);
}

export async function togglePinTeamNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const note = await db.teamNote.findUnique({ where: { id: noteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.teamNote.update({
    where: { id: noteId },
    data: { pinned: !note.pinned },
  });

  revalidatePath(`/teams/${note.teamId}`);
}
