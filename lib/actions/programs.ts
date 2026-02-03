"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPrograms() {
  return db.program.findMany({
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
  return db.program.findUnique({
    where: { id },
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
  const program = await db.program.create({
    data: {
      name: data.name,
      description: data.description,
      workouts: {
        create: data.workouts.map((w) => ({
          name: w.name,
          order: w.order,
          exercises: {
            create: w.exercises.map((e) => ({
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
  // Delete existing workouts and recreate
  await db.workout.deleteMany({ where: { programId: id } });

  const program = await db.program.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      workouts: {
        create: data.workouts.map((w) => ({
          name: w.name,
          order: w.order,
          exercises: {
            create: w.exercises.map((e) => ({
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
  await db.program.delete({ where: { id } });
  revalidatePath("/programs");
}

export async function duplicateProgram(id: string) {
  const original = await db.program.findUnique({
    where: { id },
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

  const copy = await db.program.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      workouts: {
        create: original.workouts.map((w) => ({
          name: w.name,
          order: w.order,
          exercises: {
            create: w.exercises.map((e) => ({
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
