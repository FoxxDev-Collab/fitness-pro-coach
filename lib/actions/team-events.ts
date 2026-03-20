"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { EventType } from "@prisma/client";

export async function getEvents(teamId: string) {
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: teamId, coachId } });
  if (!team) throw new Error("Team not found");

  return db.teamEvent.findMany({
    where: { teamId },
    orderBy: { startTime: "asc" },
  });
}

export async function getUpcomingEvents(teamId: string) {
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: teamId, coachId } });
  if (!team) throw new Error("Team not found");

  return db.teamEvent.findMany({
    where: { teamId, startTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    take: 10,
  });
}

export async function createEvent(
  teamId: string,
  data: {
    title: string;
    type: EventType;
    description?: string;
    location?: string;
    opponent?: string;
    startTime: Date;
    endTime?: Date;
    allDay?: boolean;
    notifyParents?: boolean;
  }
) {
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: teamId, coachId } });
  if (!team) throw new Error("Team not found");

  const event = await db.teamEvent.create({
    data: { ...data, teamId },
  });

  // Send notifications if enabled
  if (data.notifyParents !== false) {
    try {
      await sendEventEmails(teamId, team.name, event.title, event.type, event.startTime, event.location);
    } catch (e) {
      console.error("Failed to send event notification emails:", e);
    }
  }

  revalidatePath(`/teams/${teamId}`);
  return event;
}

export async function updateEvent(
  id: string,
  data: {
    title?: string;
    type?: EventType;
    description?: string;
    location?: string;
    opponent?: string;
    startTime?: Date;
    endTime?: Date;
    allDay?: boolean;
    notifyParents?: boolean;
  }
) {
  const event = await db.teamEvent.findUnique({
    where: { id },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!event) throw new Error("Event not found");

  const coachId = await getCoachId();
  if (event.team.coachId !== coachId) throw new Error("Not authorized");

  const updated = await db.teamEvent.update({ where: { id }, data });
  revalidatePath(`/teams/${event.team.id}`);
  return updated;
}

export async function deleteEvent(id: string) {
  const event = await db.teamEvent.findUnique({
    where: { id },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!event) throw new Error("Event not found");

  const coachId = await getCoachId();
  if (event.team.coachId !== coachId) throw new Error("Not authorized");

  await db.teamEvent.delete({ where: { id } });
  revalidatePath(`/teams/${event.team.id}`);
}

// ─── Email helpers ─────────────────────────────────────────

async function sendEventEmails(
  teamId: string,
  teamName: string,
  eventTitle: string,
  eventType: string,
  startTime: Date,
  location: string | null | undefined
) {
  const { sendTeamEventEmail } = await import("@/lib/email");
  const athletes = await db.athlete.findMany({
    where: { teamId, active: true },
    select: { email: true, parentEmail: true, name: true },
  });

  const emails = new Set<string>();
  for (const a of athletes) {
    if (a.email) emails.add(a.email);
    if (a.parentEmail) emails.add(a.parentEmail);
  }

  for (const email of emails) {
    try {
      await sendTeamEventEmail(email, teamName, eventTitle, eventType, startTime, location ?? undefined);
    } catch (e) {
      console.error(`Failed to send event email to ${email}:`, e);
    }
  }
}
