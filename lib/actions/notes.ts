"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendNoteAddedEmail } from "@/lib/email";
import { cuid } from "@/lib/validations";
import { noteContent } from "@/lib/validations/notes";

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

export async function createNote(clientId: string, content: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeClientId = validateId(clientId, "client id");
  const safeContent = validateContent(content);

  const client = await db.client.findUnique({
    where: { id: safeClientId },
    select: { coachId: true },
  });
  if (!client || client.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.clientNote.create({
    data: { clientId: safeClientId, coachId: session.user.id, content: safeContent },
  });

  revalidatePath(`/clients/${safeClientId}`);

  // Send notification email if client has a linked user account
  try {
    const fullClient = await db.client.findUnique({
      where: { id: safeClientId },
      select: { name: true, userId: true },
    });
    if (fullClient?.userId) {
      const clientUser = await db.user.findUnique({
        where: { id: fullClient.userId },
        select: { email: true },
      });
      if (clientUser?.email) {
        const coachName = session.user.name || "Your Coach";
        const preview = safeContent.length > 200 ? safeContent.slice(0, 200) + "..." : safeContent;
        await sendNoteAddedEmail(clientUser.email, fullClient.name, coachName, preview);
      }
    }
  } catch (e) {
    console.error("Failed to send note email:", e);
  }
}

export async function updateNote(noteId: string, content: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");
  const safeContent = validateContent(content);

  const note = await db.clientNote.findUnique({ where: { id: safeNoteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.clientNote.update({ where: { id: safeNoteId }, data: { content: safeContent } });

  revalidatePath(`/clients/${note.clientId}`);
}

export async function deleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");

  const note = await db.clientNote.findUnique({ where: { id: safeNoteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.clientNote.delete({ where: { id: safeNoteId } });

  revalidatePath(`/clients/${note.clientId}`);
}

export async function togglePinNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const safeNoteId = validateId(noteId, "note id");

  const note = await db.clientNote.findUnique({ where: { id: safeNoteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.clientNote.update({
    where: { id: safeNoteId },
    data: { pinned: !note.pinned },
  });

  revalidatePath(`/clients/${note.clientId}`);
}

export async function getClientNotes(clientId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const safeClientId = validateId(clientId, "client id");

  // Coach or the client themselves can view
  if (session.user.role === "COACH") {
    const client = await db.client.findUnique({
      where: { id: safeClientId },
      select: { coachId: true },
    });
    if (!client || client.coachId !== session.user.id) throw new Error("Unauthorized");
  } else if (session.user.role === "CLIENT") {
    const client = await db.client.findUnique({
      where: { id: safeClientId },
      select: { userId: true },
    });
    if (!client || client.userId !== session.user.id) throw new Error("Unauthorized");
  } else {
    throw new Error("Unauthorized");
  }

  return db.clientNote.findMany({
    where: { clientId: safeClientId },
    include: { coach: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}

