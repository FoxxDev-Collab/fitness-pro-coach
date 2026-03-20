"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendNoteAddedEmail } from "@/lib/email";

export async function createNote(clientId: string, content: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { coachId: true },
  });
  if (!client || client.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.clientNote.create({
    data: { clientId, coachId: session.user.id, content },
  });

  revalidatePath(`/clients/${clientId}`);

  // Send notification email if client has a linked user account
  try {
    const fullClient = await db.client.findUnique({
      where: { id: clientId },
      select: { name: true, userId: true },
    });
    if (fullClient?.userId) {
      const clientUser = await db.user.findUnique({
        where: { id: fullClient.userId },
        select: { email: true },
      });
      if (clientUser?.email) {
        const coachName = session.user.name || "Your Coach";
        const preview = content.length > 200 ? content.slice(0, 200) + "..." : content;
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

  const note = await db.clientNote.findUnique({ where: { id: noteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.clientNote.update({ where: { id: noteId }, data: { content } });

  revalidatePath(`/clients/${note.clientId}`);
}

export async function deleteNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const note = await db.clientNote.findUnique({ where: { id: noteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.clientNote.delete({ where: { id: noteId } });

  revalidatePath(`/clients/${note.clientId}`);
}

export async function togglePinNote(noteId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const note = await db.clientNote.findUnique({ where: { id: noteId } });
  if (!note || note.coachId !== session.user.id) throw new Error("Unauthorized");

  await db.clientNote.update({
    where: { id: noteId },
    data: { pinned: !note.pinned },
  });

  revalidatePath(`/clients/${note.clientId}`);
}

export async function getClientNotes(clientId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Coach or the client themselves can view
  if (session.user.role === "COACH") {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { coachId: true },
    });
    if (!client || client.coachId !== session.user.id) throw new Error("Unauthorized");
  } else if (session.user.role === "CLIENT") {
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { userId: true },
    });
    if (!client || client.userId !== session.user.id) throw new Error("Unauthorized");
  } else {
    throw new Error("Unauthorized");
  }

  return db.clientNote.findMany({
    where: { clientId },
    include: { coach: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
}
