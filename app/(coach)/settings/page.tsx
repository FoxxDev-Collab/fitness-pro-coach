import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      mfaEnabled: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <SettingsClient
      name={user.name || ""}
      email={user.email}
      emailVerified={!!user.emailVerified}
      mfaEnabled={user.mfaEnabled}
      joinedAt={user.createdAt.toISOString()}
    />
  );
}
