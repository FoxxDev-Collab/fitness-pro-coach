"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { sendInviteEmail } from "@/lib/email";

export async function inviteClient(clientId: string) {
  const coachId = await getCoachId();

  const client = await db.client.findFirst({
    where: { id: clientId, coachId },
  });

  if (!client) throw new Error("Client not found");
  if (!client.email) throw new Error("Client has no email address");
  if (client.userId) throw new Error("Client already has an account");

  const coach = await db.user.findUnique({
    where: { id: coachId },
    select: { name: true },
  });

  // Expire any existing unused invites for this client
  await db.inviteToken.updateMany({
    where: { clientId, used: false },
    data: { used: true },
  });

  const invite = await db.inviteToken.create({
    data: {
      email: client.email,
      clientId,
      coachId,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${invite.token}`;

  await sendInviteEmail(
    client.email,
    inviteUrl,
    coach?.name || "Your Coach"
  );

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function getClientInviteStatus(clientId: string) {
  const coachId = await getCoachId();

  const client = await db.client.findFirst({
    where: { id: clientId, coachId },
    select: { email: true, userId: true },
  });

  if (!client) return null;

  if (client.userId) return "active";

  const invite = await db.inviteToken.findFirst({
    where: { clientId, used: false, expires: { gt: new Date() } },
  });

  if (invite) return "pending";
  return "none";
}
