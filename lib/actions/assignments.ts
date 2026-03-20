"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";

export async function assignProgram(data: {
  clientId: string;
  programId: string;
  name: string;
  startDate?: Date;
}) {
  const coachId = await getCoachId();

  // Verify client belongs to this coach
  const client = await db.client.findFirst({ where: { id: data.clientId, coachId } });
  if (!client) throw new Error("Client not found");

  // Verify program belongs to this coach
  const program = await db.program.findFirst({
    where: { id: data.programId, coachId },
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
  const coachId = await getCoachId();
  const assignment = await db.assignment.findUnique({
    where: { id },
    include: { client: { select: { coachId: true, id: true } } },
  });
  if (!assignment || assignment.client.coachId !== coachId) return;

  await db.assignment.delete({ where: { id } });
  revalidatePath(`/clients/${assignment.client.id}`);
  revalidatePath("/programs");
}
