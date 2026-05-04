"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { cuid, parseInput } from "@/lib/validations";
import {
  createProgramSchema,
  updateProgramSchema,
  type CreateProgramInput,
  type UpdateProgramInput,
  type WorkoutInput,
  type WorkoutExerciseInput,
} from "@/lib/validations/programs";

function validateId(id: unknown): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error("Invalid program id");
  return parsed.data;
}

async function assertExercisesUsable(coachId: string, exerciseIds: string[]) {
  if (exerciseIds.length === 0) return;
  const unique = Array.from(new Set(exerciseIds));
  const found = await db.exercise.findMany({
    where: {
      id: { in: unique },
      OR: [{ coachId: null }, { coachId }],
    },
    select: { id: true },
  });
  if (found.length !== unique.length) {
    throw new Error("One or more exercises are invalid");
  }
}

function collectExerciseIds(workouts: WorkoutInput[]): string[] {
  return workouts.flatMap((w) => w.exercises.map((e: WorkoutExerciseInput) => e.exerciseId));
}

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
  const safeId = validateId(id);
  const coachId = await getCoachId();
  return db.program.findFirst({
    where: { id: safeId, coachId },
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

export async function createProgram(data: CreateProgramInput) {
  const parsed = parseInput(createProgramSchema, data);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  await assertExercisesUsable(coachId, collectExerciseIds(parsed.data.workouts));

  const program = await db.program.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      coachId,
      workouts: {
        create: parsed.data.workouts.map((w) => ({
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

export async function updateProgram(id: string, data: UpdateProgramInput) {
  const safeId = validateId(id);
  const parsed = parseInput(updateProgramSchema, data);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  const existing = await db.program.findFirst({ where: { id: safeId, coachId } });
  if (!existing) throw new Error("Program not found");

  await assertExercisesUsable(coachId, collectExerciseIds(parsed.data.workouts));

  await db.workout.deleteMany({ where: { programId: safeId } });

  const program = await db.program.update({
    where: { id: safeId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      workouts: {
        create: parsed.data.workouts.map((w) => ({
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
  revalidatePath(`/programs/${safeId}`);
  return program;
}

export async function deleteProgram(id: string) {
  const safeId = validateId(id);
  const coachId = await getCoachId();
  await db.program.delete({ where: { id: safeId, coachId } });
  revalidatePath("/programs");
}

export async function duplicateProgram(id: string) {
  const safeId = validateId(id);
  const coachId = await getCoachId();
  const original = await db.program.findFirst({
    where: { id: safeId, coachId },
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
