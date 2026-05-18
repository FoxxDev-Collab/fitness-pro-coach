"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getEffectiveSession, requireClient, getCoachId } from "@/lib/auth-utils";
import { parseInput } from "@/lib/validations";
import { submitIntakeSchema, type SubmitIntakeInput } from "@/lib/validations/intake";

const cuidRegex = /^[a-z0-9]{20,40}$/;

export async function getIntakeBundle() {
  const session = await requireClient();

  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      coachId: true,
      intakeResponse: { select: { id: true } },
    },
  });
  if (!client?.coachId) throw new Error("Client has no assigned coach");

  const coach = await db.user.findUnique({
    where: { id: client.coachId },
    select: { name: true, businessName: true, waiverText: true },
  });
  if (!coach?.waiverText) throw new Error("Your coach hasn't set up their waiver yet — please contact them.");

  const questions = await db.intakeQuestion.findMany({
    where: { coachId: client.coachId, archived: false },
    orderBy: { position: "asc" },
  });

  return {
    clientId: client.id,
    clientName: client.name,
    alreadySubmitted: !!client.intakeResponse,
    coachName: coach.businessName || coach.name || "Your Coach",
    waiverText: coach.waiverText,
    questions,
  };
}

export async function submitIntake(input: SubmitIntakeInput) {
  const session = await requireClient();
  const parsed = parseInput(submitIntakeSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      coachId: true,
      intakeResponse: { select: { id: true } },
    },
  });
  if (!client) return { error: "Client profile not found" };
  if (!client.coachId) return { error: "No assigned coach" };
  if (client.intakeResponse) return { error: "Intake already submitted" };

  const coach = await db.user.findUnique({
    where: { id: client.coachId },
    select: { waiverText: true },
  });
  if (!coach?.waiverText) return { error: "Your coach hasn't set up their waiver yet" };

  // Snapshot all questions referenced by customAnswers, validating they belong to the coach.
  const questionIds = parsed.data.customAnswers.map((a) => a.questionId);
  const questions = questionIds.length > 0
    ? await db.intakeQuestion.findMany({
        where: { id: { in: questionIds }, coachId: client.coachId },
      })
    : [];
  if (questions.length !== questionIds.length) {
    return { error: "Some custom answers reference invalid questions" };
  }
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  // Verify required questions are answered.
  const allCoachQuestions = await db.intakeQuestion.findMany({
    where: { coachId: client.coachId, archived: false, required: true },
    select: { id: true, text: true },
  });
  const answeredIds = new Set(parsed.data.customAnswers
    .filter((a) => (a.textValue && a.textValue.trim() !== "") || a.choiceValues.length > 0)
    .map((a) => a.questionId));
  const missing = allCoachQuestions.filter((q) => !answeredIds.has(q.id));
  if (missing.length > 0) {
    return { error: `Please answer: ${missing.map((q) => q.text).join(", ")}` };
  }

  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  const userAgent = hdrs.get("user-agent") || "unknown";

  await db.$transaction(async (tx) => {
    const response = await tx.intakeResponse.create({
      data: {
        clientId: client.id,
        dateOfBirth: parsed.data.dateOfBirth,
        sex: parsed.data.sex,
        heightInches: parsed.data.heightInches,
        weightLbs: parsed.data.weightLbs,
        occupation: parsed.data.occupation,
        medicalConditions: parsed.data.medicalConditions,
        conditionsOther: parsed.data.conditionsOther,
        medications: parsed.data.medications,
        pregnancyStatus: parsed.data.pregnancyStatus,
        physicianRestrictions: parsed.data.physicianRestrictions,
        physicianName: parsed.data.physicianName,
        physicianPhone: parsed.data.physicianPhone,
        injuries: parsed.data.injuries.length > 0 ? parsed.data.injuries : Prisma.JsonNull,
        chronicPain: parsed.data.chronicPain,
        painAreas: parsed.data.painAreas,
        waiverTextSnapshot: coach.waiverText!,
        signatureName: parsed.data.signatureName,
        signatureIp: ip,
        signatureUserAgent: userAgent,
        signedAt: new Date(),
      },
    });

    if (parsed.data.customAnswers.length > 0) {
      await tx.intakeAnswer.createMany({
        data: parsed.data.customAnswers.map((a) => {
          const q = questionsById.get(a.questionId)!;
          return {
            responseId: response.id,
            questionId: q.id,
            textValue: a.textValue,
            choiceValues: a.choiceValues,
            questionTextSnapshot: q.text,
            questionTypeSnapshot: q.type,
            optionsSnapshot: q.options,
          };
        }),
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/onboarding/intake");
  return { success: true };
}

export async function requestIntakeRetake(clientId: string) {
  if (!cuidRegex.test(clientId)) return { error: "Invalid client id" };
  const coachId = await getCoachId();

  const client = await db.client.findFirst({
    where: { id: clientId, coachId },
    select: { id: true, intakeResponse: { select: { id: true } } },
  });
  if (!client) return { error: "Client not found" };
  if (!client.intakeResponse) return { error: "No intake response to clear" };

  await db.intakeResponse.delete({ where: { id: client.intakeResponse.id } });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function getClientIntakeForCoach(clientId: string) {
  if (!cuidRegex.test(clientId)) return null;
  const coachId = await getCoachId();
  const client = await db.client.findFirst({
    where: { id: clientId, coachId },
    select: {
      id: true,
      intakeResponse: {
        include: {
          answers: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });
  return client?.intakeResponse ?? null;
}
