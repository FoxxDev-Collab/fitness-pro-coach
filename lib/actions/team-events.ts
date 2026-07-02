"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { cuid, parseInput } from "@/lib/validations";
import {
  createEventSchema,
  updateEventSchema,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/lib/validations/team-events";

function validateId(id: unknown, label: string): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error(`Invalid ${label}`);
  return parsed.data;
}

export async function getEvents(teamId: string) {
  const safeTeamId = validateId(teamId, "team id");
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: safeTeamId, coachId } });
  if (!team) throw new Error("Team not found");

  return db.teamEvent.findMany({
    where: { teamId: safeTeamId },
    orderBy: { startTime: "asc" },
  });
}

export async function getUpcomingEvents(teamId: string) {
  const safeTeamId = validateId(teamId, "team id");
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: safeTeamId, coachId } });
  if (!team) throw new Error("Team not found");

  return db.teamEvent.findMany({
    where: { teamId: safeTeamId, startTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    take: 10,
  });
}

export async function createEvent(teamId: string, input: CreateEventInput) {
  const safeTeamId = validateId(teamId, "team id");
  const parsed = parseInput(createEventSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const data = parsed.data;

  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: safeTeamId, coachId } });
  if (!team) throw new Error("Team not found");

  const event = await db.teamEvent.create({
    data: { ...data, teamId: safeTeamId },
  });

  // Send notifications if enabled
  if (data.notifyParents !== false) {
    try {
      await sendEventEmails(event.id, safeTeamId, team.name, event.title, event.type, event.startTime, event.location);
    } catch (e) {
      console.error("Failed to send event notification emails:", e);
    }
  }

  revalidatePath(`/teams/${safeTeamId}`);
  return event;
}

export async function updateEvent(id: string, input: UpdateEventInput) {
  const safeId = validateId(id, "event id");
  const parsed = parseInput(updateEventSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);

  const event = await db.teamEvent.findUnique({
    where: { id: safeId },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!event) throw new Error("Event not found");

  const coachId = await getCoachId();
  if (event.team.coachId !== coachId) throw new Error("Not authorized");

  const updated = await db.teamEvent.update({ where: { id: safeId }, data: parsed.data });

  // Notify athletes & parents about the updated event when requested.
  if (parsed.data.notifyParents === true) {
    try {
      const team = await db.team.findUnique({
        where: { id: event.team.id },
        select: { name: true },
      });
      if (team) {
        await sendEventEmails(
          updated.id,
          event.team.id,
          team.name,
          updated.title,
          updated.type,
          updated.startTime,
          updated.location,
        );
      }
    } catch (e) {
      console.error("Failed to send event update notification emails:", e);
    }
  }

  revalidatePath(`/teams/${event.team.id}`);
  return updated;
}

export async function deleteEvent(id: string) {
  const safeId = validateId(id, "event id");
  const event = await db.teamEvent.findUnique({
    where: { id: safeId },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!event) throw new Error("Event not found");

  const coachId = await getCoachId();
  if (event.team.coachId !== coachId) throw new Error("Not authorized");

  await db.teamEvent.delete({ where: { id: safeId } });
  revalidatePath(`/teams/${event.team.id}`);
}

// ─── Email helpers ─────────────────────────────────────────

async function sendEventEmails(
  eventId: string,
  teamId: string,
  teamName: string,
  eventTitle: string,
  eventType: string,
  startTime: Date,
  location: string | null | undefined,
) {
  const { sendTeamEventEmail } = await import("@/lib/email");
  const athletes = await db.athlete.findMany({
    where: { teamId, active: true },
    select: { email: true, parentEmail: true, name: true },
  });

  // Normalize before deduping so the same person listed under both athlete +
  // parent email (or with different casing/whitespace) gets a single email.
  const emails = new Set<string>();
  for (const a of athletes) {
    if (a.email) emails.add(a.email.trim().toLowerCase());
    if (a.parentEmail) emails.add(a.parentEmail.trim().toLowerCase());
  }

  for (const email of emails) {
    try {
      await sendTeamEventEmail(
        email,
        teamName,
        eventTitle,
        eventType,
        startTime,
        location ?? undefined,
        `event:${eventId}:${email}`,
      );
    } catch (e) {
      console.error(`Failed to send event email to ${email}:`, e);
    }
  }
}
