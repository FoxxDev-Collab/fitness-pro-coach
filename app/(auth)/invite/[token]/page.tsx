import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { InviteForm } from "./invite-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invite = await db.inviteToken.findUnique({
    where: { token },
  });

  if (!invite || invite.used || invite.expires < new Date()) {
    notFound();
  }

  const client = await db.client.findUnique({
    where: { id: invite.clientId },
  });

  const coach = await db.user.findUnique({
    where: { id: invite.coachId },
    select: { name: true },
  });

  if (!client || !coach) {
    notFound();
  }

  return (
    <InviteForm
      token={token}
      clientName={client.name}
      coachName={coach.name || "Your Coach"}
    />
  );
}
