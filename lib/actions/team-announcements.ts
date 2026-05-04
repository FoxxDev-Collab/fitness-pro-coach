"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { cuid, parseInput } from "@/lib/validations";
import {
  createAnnouncementSchema,
  type CreateAnnouncementInput,
} from "@/lib/validations/team-events";

function validateId(id: unknown, label: string): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error(`Invalid ${label}`);
  return parsed.data;
}

export async function getAnnouncements(teamId: string) {
  const safeTeamId = validateId(teamId, "team id");
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: safeTeamId, coachId } });
  if (!team) throw new Error("Team not found");

  return db.teamAnnouncement.findMany({
    where: { teamId: safeTeamId },
    orderBy: { sentAt: "desc" },
  });
}

export async function createAnnouncement(teamId: string, input: CreateAnnouncementInput) {
  const safeTeamId = validateId(teamId, "team id");
  const parsed = parseInput(createAnnouncementSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const data = parsed.data;

  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: safeTeamId, coachId } });
  if (!team) throw new Error("Team not found");

  const announcement = await db.teamAnnouncement.create({
    data: { ...data, teamId: safeTeamId },
  });

  if (data.notifyParents !== false) {
    try {
      await sendAnnouncementEmails(safeTeamId, team.name, data.subject, data.body);
    } catch (e) {
      console.error("Failed to send announcement emails:", e);
    }
  }

  revalidatePath(`/teams/${safeTeamId}`);
  return announcement;
}

export async function deleteAnnouncement(id: string) {
  const safeId = validateId(id, "announcement id");
  const announcement = await db.teamAnnouncement.findUnique({
    where: { id: safeId },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!announcement) throw new Error("Announcement not found");

  const coachId = await getCoachId();
  if (announcement.team.coachId !== coachId) throw new Error("Not authorized");

  await db.teamAnnouncement.delete({ where: { id: safeId } });
  revalidatePath(`/teams/${announcement.team.id}`);
}

async function sendAnnouncementEmails(
  teamId: string,
  teamName: string,
  subject: string,
  body: string,
) {
  const { sendTeamAnnouncementEmail } = await import("@/lib/email");
  const athletes = await db.athlete.findMany({
    where: { teamId, active: true },
    select: { email: true, parentEmail: true },
  });

  const emails = new Set<string>();
  for (const a of athletes) {
    if (a.email) emails.add(a.email);
    if (a.parentEmail) emails.add(a.parentEmail);
  }

  for (const email of emails) {
    try {
      await sendTeamAnnouncementEmail(email, teamName, subject, body);
    } catch (e) {
      console.error(`Failed to send announcement email to ${email}:`, e);
    }
  }
}
