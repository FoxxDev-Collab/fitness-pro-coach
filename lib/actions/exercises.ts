"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { cuid, parseInput } from "@/lib/validations";
import {
  createExerciseSchema,
  updateExerciseSchema,
  type CreateExerciseInput,
  type UpdateExerciseInput,
} from "@/lib/validations/exercises";

function validateId(id: unknown): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error("Invalid exercise id");
  return parsed.data;
}

export async function getExercises() {
  const coachId = await getCoachId();
  return db.exercise.findMany({
    where: {
      OR: [{ coachId: null }, { coachId }],
    },
    orderBy: [{ custom: "asc" }, { name: "asc" }],
  });
}

export async function getExercise(id: string) {
  const safeId = validateId(id);
  const coachId = await getCoachId();
  return db.exercise.findFirst({
    where: {
      id: safeId,
      OR: [{ coachId: null }, { coachId }],
    },
  });
}

export async function createExercise(data: CreateExerciseInput) {
  const parsed = parseInput(createExerciseSchema, data);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  const exercise = await db.exercise.create({
    data: {
      ...parsed.data,
      custom: true,
      coachId,
    },
  });
  revalidatePath("/exercises");
  return exercise;
}

export async function updateExercise(id: string, data: UpdateExerciseInput) {
  const safeId = validateId(id);
  const parsed = parseInput(updateExerciseSchema, data);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  // Verify ownership: only allow editing own custom exercises (not system defaults)
  const existing = await db.exercise.findFirst({
    where: { id: safeId, coachId, custom: true },
    select: { id: true },
  });
  if (!existing) throw new Error("Exercise not found or cannot be edited");

  const exercise = await db.exercise.update({
    where: { id: safeId },
    data: parsed.data,
  });
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${safeId}`);
  return exercise;
}

export async function deleteExercise(id: string) {
  const safeId = validateId(id);
  const coachId = await getCoachId();
  // Only allow deleting own custom exercises
  const existing = await db.exercise.findFirst({
    where: { id: safeId, coachId, custom: true },
    select: { id: true },
  });
  if (!existing) throw new Error("Exercise not found or cannot be deleted");

  await db.exercise.delete({ where: { id: safeId } });
  revalidatePath("/exercises");
}
