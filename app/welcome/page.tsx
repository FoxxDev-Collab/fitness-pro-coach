import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { WelcomeWizard } from "./welcome-wizard";

export default async function WelcomePage() {
  const session = await requireCoach();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      businessName: true,
      specialty: true,
      bio: true,
      timezone: true,
      onboardedAt: true,
    },
  });
  if (!user) redirect("/login");
  if (user.onboardedAt) redirect("/");

  return (
    <WelcomeWizard
      initialName={user.name ?? ""}
      initialBusinessName={user.businessName ?? ""}
      initialSpecialty={user.specialty ?? ""}
      initialBio={user.bio ?? ""}
      initialTimezone={user.timezone ?? ""}
    />
  );
}
