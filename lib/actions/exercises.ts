"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";

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
  const coachId = await getCoachId();
  return db.exercise.findFirst({
    where: {
      id,
      OR: [{ coachId: null }, { coachId }],
    },
  });
}

export async function createExercise(data: {
  name: string;
  category: string;
  type: string;
  equipment?: string;
  muscles: string[];
  instructions?: string;
  tips?: string;
  image?: string;
}) {
  const coachId = await getCoachId();
  const exercise = await db.exercise.create({
    data: {
      ...data,
      custom: true,
      coachId,
    },
  });
  revalidatePath("/exercises");
  return exercise;
}

export async function updateExercise(
  id: string,
  data: {
    name?: string;
    category?: string;
    type?: string;
    equipment?: string;
    muscles?: string[];
    instructions?: string;
    tips?: string;
    image?: string;
  }
) {
  const coachId = await getCoachId();
  // Only allow editing own custom exercises
  const exercise = await db.exercise.update({
    where: { id, coachId },
    data,
  });
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
  return exercise;
}

export async function deleteExercise(id: string) {
  const coachId = await getCoachId();
  await db.exercise.delete({ where: { id, coachId } });
  revalidatePath("/exercises");
}
