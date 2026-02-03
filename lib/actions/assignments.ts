"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function assignProgram(data: {
  clientId: string;
  programId: string;
  name: string;
  startDate?: Date;
}) {
  // Get the program with its workouts and exercises
  const program = await db.program.findUnique({
    where: { id: data.programId },
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
    },
  });

  if (!program) throw new Error("Program not found");

  type ProgramWorkout = (typeof program.workouts)[number];
  type WorkoutExercise = ProgramWorkout["exercises"][number];

  // Create the assignment with copied workouts and exercises
  const assignment = await db.assignment.create({
    data: {
      clientId: data.clientId,
      programId: data.programId,
      name: data.name,
      startDate: data.startDate,
      workouts: {
        create: program.workouts.map((w: ProgramWorkout) => ({
          name: w.name,
          order: w.order,
          exercises: {
            create: w.exercises.map((we: WorkoutExercise) => ({
              exerciseId: we.exerciseId,
              name: we.exercise.name,
              type: we.exercise.type,
              category: we.exercise.category,
              order: we.order,
              sets: we.sets,
              reps: we.reps,
              weight: we.weight,
              duration: we.duration,
              distance: we.distance,
              rest: we.rest,
              notes: we.notes,
            })),
          },
        })),
      },
    },
  });

  revalidatePath(`/clients/${data.clientId}`);
  revalidatePath("/programs");
  return assignment;
}

export async function deleteAssignment(id: string) {
  const assignment = await db.assignment.findUnique({ where: { id } });
  if (assignment) {
    await db.assignment.delete({ where: { id } });
    revalidatePath(`/clients/${assignment.clientId}`);
    revalidatePath("/programs");
  }
}
