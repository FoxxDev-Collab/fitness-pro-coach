import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/actions/coach-profile";
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
      intakeSlug: true,
      timezone: true,
      onboardedAt: true,
    },
  });
  if (!user) redirect("/login");
  if (user.onboardedAt) redirect("/");

  // Pre-generate a slug suggestion from their name so step 2 isn't empty
  const slugSeed = user.intakeSlug ?? (user.name || "coach");
  const suggestedSlug = await generateUniqueSlug(slugSeed, session.user.id);

  return (
    <WelcomeWizard
      initialName={user.name ?? ""}
      initialBusinessName={user.businessName ?? ""}
      initialSpecialty={user.specialty ?? ""}
      initialBio={user.bio ?? ""}
      initialSlug={user.intakeSlug ?? suggestedSlug}
      initialTimezone={user.timezone ?? ""}
    />
  );
}
