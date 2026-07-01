"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { parseInput } from "@/lib/validations";
import {
  updateWaiverTextSchema,
  createIntakeQuestionSchema,
  updateIntakeQuestionSchema,
  reorderQuestionsSchema,
  type UpdateWaiverTextInput,
  type CreateIntakeQuestionInput,
} from "@/lib/validations/intake";

const cuidRegex = /^[a-z0-9]{20,40}$/;

export async function updateWaiverText(input: UpdateWaiverTextInput) {
  const parsed = parseInput(updateWaiverTextSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();
  await db.user.update({
    where: { id: coachId },
    data: { waiverText: parsed.data.waiverText },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function createIntakeQuestion(input: CreateIntakeQuestionInput) {
  const parsed = parseInput(createIntakeQuestionSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();
  const maxPosition = await db.intakeQuestion.aggregate({
    where: { coachId, archived: false },
    _max: { position: true },
  });
  const nextPosition = (maxPosition._max.position ?? -1) + 1;

  const question = await db.intakeQuestion.create({
    data: {
      coachId,
      text: parsed.data.text,
      type: parsed.data.type,
      options: parsed.data.options,
      required: parsed.data.required,
      position: nextPosition,
    },
  });

  revalidatePath("/settings");
  return { success: true, question };
}

export async function updateIntakeQuestion(id: string, input: CreateIntakeQuestionInput) {
  if (!cuidRegex.test(id)) return { error: "Invalid question id" };
  const parsed = parseInput(updateIntakeQuestionSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();
  const existing = await db.intakeQuestion.findFirst({ where: { id, coachId } });
  if (!existing) return { error: "Question not found" };

  await db.intakeQuestion.update({
    where: { id },
    data: {
      text: parsed.data.text,
      type: parsed.data.type,
      options: parsed.data.options,
      required: parsed.data.required,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function archiveIntakeQuestion(id: string) {
  if (!cuidRegex.test(id)) return { error: "Invalid question id" };
  const coachId = await getCoachId();
  const existing = await db.intakeQuestion.findFirst({ where: { id, coachId } });
  if (!existing) return { error: "Question not found" };

  await db.intakeQuestion.update({
    where: { id },
    data: { archived: true },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function reorderIntakeQuestions(orderedIds: string[]) {
  const parsed = parseInput(reorderQuestionsSchema, { orderedIds });
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();
  const owned = await db.intakeQuestion.findMany({
    where: { id: { in: parsed.data.orderedIds }, coachId },
    select: { id: true },
  });
  if (owned.length !== parsed.data.orderedIds.length) {
    return { error: "Some questions don't belong to you" };
  }

  await db.$transaction(
    parsed.data.orderedIds.map((id, idx) =>
      db.intakeQuestion.update({ where: { id }, data: { position: idx } }),
    ),
  );

  revalidatePath("/settings");
  return { success: true };
}

export async function getCoachIntakeConfig() {
  const coachId = await getCoachId();
  const [user, questions] = await Promise.all([
    db.user.findUnique({
      where: { id: coachId },
      select: { waiverText: true },
    }),
    db.intakeQuestion.findMany({
      where: { coachId, archived: false },
      orderBy: { position: "asc" },
    }),
  ]);
  return {
    waiverText: user?.waiverText ?? "",
    questions,
  };
}
