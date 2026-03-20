"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

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
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  // Verify access: coach owns the client, or client owns the assignment
  const assignment = await db.assignment.findUnique({
    where: { id: data.assignmentId },
    include: { client: { select: { coachId: true, userId: true, id: true } } },
  });

  if (!assignment) throw new Error("Assignment not found");

  const isCoach = session.user.role === "COACH" && assignment.client.coachId === session.user.id;
  const isClient = session.user.role === "CLIENT" && assignment.client.userId === session.user.id;

  if (!isCoach && !isClient) throw new Error("Unauthorized");

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

  revalidatePath(`/clients/${assignment.client.id}`);
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  revalidatePath("/progress");

  return sessionLog;
}
