"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getExercises() {
  return db.exercise.findMany({
    orderBy: [{ custom: "asc" }, { name: "asc" }],
  });
}

export async function getExercise(id: string) {
  return db.exercise.findUnique({ where: { id } });
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
  const exercise = await db.exercise.create({
    data: {
      ...data,
      custom: true,
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
  const exercise = await db.exercise.update({
    where: { id },
    data,
  });
  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
  return exercise;
}

export async function deleteExercise(id: string) {
  await db.exercise.delete({ where: { id } });
  revalidatePath("/exercises");
}
