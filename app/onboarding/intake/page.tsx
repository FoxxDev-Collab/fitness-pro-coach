import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth-utils";
import { getIntakeBundle } from "@/lib/actions/intake";
import { IntakeForm } from "./intake-form";

export default async function IntakeOnboardingPage() {
  await requireClient();
  const bundle = await getIntakeBundle();

  if (bundle.alreadySubmitted) {
    redirect("/dashboard");
  }

  return (
    <IntakeForm
      coachName={bundle.coachName}
      waiverText={bundle.waiverText}
      questions={bundle.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        required: q.required,
      }))}
    />
  );
}
