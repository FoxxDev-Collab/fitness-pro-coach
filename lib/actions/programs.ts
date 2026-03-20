"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";

export async function getPrograms() {
  const coachId = await getCoachId();
  return db.program.findMany({
    where: { coachId },
    orderBy: { name: "asc" },
    include: {
      workouts: {
        include: {
          exercises: {
            include: {
              exercise: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
      _count: {
        select: { assignments: true },
      },
    },
  });
}

export async function getProgram(id: string) {
  const coachId = await getCoachId();
  return db.program.findFirst({
    where: { id, coachId },
    include: {
      workouts: {
        include: {
          exercises: {
            include: {
              exercise: true,
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });
}

type WorkoutExerciseInput = {
  exerciseId: string;
  order: number;
  sets: number;
  reps: number;
  weight: number;
  duration: number;
  distance: number;
  rest: number;
  notes?: string;
};

type WorkoutInput = {
  name: string;
  order: number;
  exercises: WorkoutExerciseInput[];
};

export async function createProgram(data: {
  name: string;
  description?: string;
  workouts: WorkoutInput[];
}) {
  const coachId = await getCoachId();
  const program = await db.program.create({
    data: {
      name: data.name,
      description: data.description,
      coachId,
      workouts: {
        create: data.workouts.map((w: WorkoutInput) => ({
          name: w.name,
          order: w.order,
          exercises: {
            create: w.exercises.map((e: WorkoutExerciseInput) => ({
              exerciseId: e.exerciseId,
              order: e.order,
              sets: e.sets,
              reps: e.reps,
              weight: e.weight,
              duration: e.duration,
              distance: e.distance,
              rest: e.rest,
              notes: e.notes,
            })),
          },
        })),
      },
    },
  });
  revalidatePath("/programs");
  return program;
}

export async function updateProgram(
  id: string,
  data: {
    name: string;
    description?: string;
    workouts: WorkoutInput[];
  }
) {
  const coachId = await getCoachId();
  // Verify ownership
  const existing = await db.program.findFirst({ where: { id, coachId } });
  if (!existing) throw new Error("Program not found");

  await db.workout.deleteMany({ where: { programId: id } });

  const program = await db.program.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      workouts: {
        create: data.workouts.map((w: WorkoutInput) => ({
          name: w.name,
          order: w.order,
          exercises: {
            create: w.exercises.map((e: WorkoutExerciseInput) => ({
              exerciseId: e.exerciseId,
              order: e.order,
              sets: e.sets,
              reps: e.reps,
              weight: e.weight,
              duration: e.duration,
              distance: e.distance,
              rest: e.rest,
              notes: e.notes,
            })),
          },
        })),
      },
    },
  });
  revalidatePath("/programs");
  revalidatePath(`/programs/${id}`);
  return program;
}

export async function deleteProgram(id: string) {
  const coachId = await getCoachId();
  await db.program.delete({ where: { id, coachId } });
  revalidatePath("/programs");
}

export async function duplicateProgram(id: string) {
  const coachId = await getCoachId();
  const original = await db.program.findFirst({
    where: { id, coachId },
    include: {
      workouts: {
        include: {
          exercises: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!original) throw new Error("Program not found");

  type OriginalWorkout = (typeof original.workouts)[number];
  type OriginalExercise = OriginalWorkout["exercises"][number];

  const copy = await db.program.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      coachId,
      workouts: {
        create: original.workouts.map((w: OriginalWorkout) => ({
          name: w.name,
          order: w.order,
          exercises: {
            create: w.exercises.map((e: OriginalExercise) => ({
              exerciseId: e.exerciseId,
              order: e.order,
              sets: e.sets,
              reps: e.reps,
              weight: e.weight,
              duration: e.duration,
              distance: e.distance,
              rest: e.rest,
              notes: e.notes,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/programs");
  return copy;
}
