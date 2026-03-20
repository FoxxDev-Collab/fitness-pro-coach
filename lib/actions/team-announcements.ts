"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";

export async function getAnnouncements(teamId: string) {
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: teamId, coachId } });
  if (!team) throw new Error("Team not found");

  return db.teamAnnouncement.findMany({
    where: { teamId },
    orderBy: { sentAt: "desc" },
  });
}

export async function createAnnouncement(
  teamId: string,
  data: {
    subject: string;
    body: string;
    notifyParents?: boolean;
  }
) {
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: teamId, coachId } });
  if (!team) throw new Error("Team not found");

  const announcement = await db.teamAnnouncement.create({
    data: { ...data, teamId },
  });

  if (data.notifyParents !== false) {
    try {
      await sendAnnouncementEmails(teamId, team.name, data.subject, data.body);
    } catch (e) {
      console.error("Failed to send announcement emails:", e);
    }
  }

  revalidatePath(`/teams/${teamId}`);
  return announcement;
}

export async function deleteAnnouncement(id: string) {
  const announcement = await db.teamAnnouncement.findUnique({
    where: { id },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!announcement) throw new Error("Announcement not found");

  const coachId = await getCoachId();
  if (announcement.team.coachId !== coachId) throw new Error("Not authorized");

  await db.teamAnnouncement.delete({ where: { id } });
  revalidatePath(`/teams/${announcement.team.id}`);
}

async function sendAnnouncementEmails(
  teamId: string,
  teamName: string,
  subject: string,
  body: string
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
