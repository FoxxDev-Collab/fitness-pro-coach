"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

type SessionSetInput = {
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
};

type SessionExerciseInput = {
  exerciseIndex: number;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  notes?: string;
  setDetails: SessionSetInput[];
};

export async function saveSession(data: {
  assignmentId: string;
  workoutIndex: number;
  sessionNotes?: string;
  duration?: number;
  date: Date;
  exercises: SessionExerciseInput[];
}) {
  const sessionLog = await db.sessionLog.create({
    data: {
      assignmentId: data.assignmentId,
      workoutIndex: data.workoutIndex,
      sessionNotes: data.sessionNotes,
      duration: data.duration,
      date: data.date,
      exercises: {
        create: data.exercises.map((ex) => ({
          exerciseIndex: ex.exerciseIndex,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          duration: ex.duration,
          distance: ex.distance,
          notes: ex.notes,
          setDetails: {
            create: ex.setDetails.map((s) => ({
              setNumber: s.setNumber,
              reps: s.reps,
              weight: s.weight,
              duration: s.duration,
              distance: s.distance,
            })),
          },
        })),
      },
    },
  });

  // Get the client ID for revalidation
  const assignment = await db.assignment.findUnique({
    where: { id: data.assignmentId },
    select: { clientId: true },
  });

  if (assignment) {
    revalidatePath(`/clients/${assignment.clientId}`);
  }
  revalidatePath("/reports");

  return sessionLog;
}
