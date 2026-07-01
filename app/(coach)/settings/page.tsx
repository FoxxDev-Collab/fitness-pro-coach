import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { CoachProfileSection } from "./coach-profile-section";
import { IntakeSection } from "./intake-section";
import { getCoachIntakeConfig } from "@/lib/actions/coach-intake-config";

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
      businessName: true,
      specialty: true,
      bio: true,
      timezone: true,
    },
  });

  if (!user) redirect("/login");

  const intakeConfig = session.user.role === "COACH" ? await getCoachIntakeConfig() : null;

  return (
    <div className="space-y-6">
      <SettingsClient
        name={user.name || ""}
        email={user.email}
        emailVerified={!!user.emailVerified}
        mfaEnabled={user.mfaEnabled}
        joinedAt={user.createdAt.toISOString()}
      />
      {session.user.role === "COACH" && (
        <>
          <CoachProfileSection
            businessName={user.businessName ?? ""}
            specialty={user.specialty ?? ""}
            bio={user.bio ?? ""}
            timezone={user.timezone ?? ""}
          />
          {intakeConfig && (
            <IntakeSection
              initialWaiverText={intakeConfig.waiverText}
              initialQuestions={intakeConfig.questions.map((q) => ({
                id: q.id,
                text: q.text,
                type: q.type,
                options: q.options,
                required: q.required,
                position: q.position,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
