"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { sendSessionCompletedEmail } from "@/lib/email";

export type ExerciseHistoryEntry = {
  exerciseIndex: number;
  lastSession: {
    date: Date;
    sets: { reps: number; weight: number; duration: number; distance: number }[];
  } | null;
};

export async function getExerciseHistory(
  assignmentId: string,
  workoutIndex: number
): Promise<ExerciseHistoryEntry[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  // Get the assignment and its exercises for this workout
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      client: { select: { id: true, coachId: true, userId: true } },
      workouts: {
        include: { exercises: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!assignment) return [];

  const isCoach = session.user.role === "COACH" && assignment.client?.coachId === session.user.id;
  const isClient = session.user.role === "CLIENT" && assignment.client?.userId === session.user.id;
  if (!isCoach && !isClient) throw new Error("Unauthorized");

  const workout = assignment.workouts[workoutIndex];
  if (!workout) return [];

  const exerciseNames = workout.exercises.map((e) => e.name);

  // Find all assignments for this client/athlete to search across all programs
  const whereClause = assignment.clientId
    ? { clientId: assignment.clientId }
    : assignment.athleteId
      ? { athleteId: assignment.athleteId }
      : { id: assignment.id };
  const clientAssignments = await db.assignment.findMany({
    where: whereClause,
    select: { id: true, workouts: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
  });

  // Build a map: exercise name → list of (assignmentId, workoutIndex, exerciseIndex)
  const exerciseLocations: Map<string, { assignmentId: string; workoutIndex: number; exerciseIndex: number }[]> = new Map();
  for (const a of clientAssignments) {
    for (let wi = 0; wi < a.workouts.length; wi++) {
      for (let ei = 0; ei < a.workouts[wi].exercises.length; ei++) {
        const name = a.workouts[wi].exercises[ei].name;
        if (!exerciseNames.includes(name)) continue;
        const list = exerciseLocations.get(name) || [];
        list.push({ assignmentId: a.id, workoutIndex: wi, exerciseIndex: ei });
        exerciseLocations.set(name, list);
      }
    }
  }

  // Fetch recent session logs for this client's assignments
  const recentLogs = await db.sessionLog.findMany({
    where: {
      assignmentId: { in: clientAssignments.map((a) => a.id) },
    },
    include: {
      exercises: {
        include: { setDetails: { orderBy: { setNumber: "asc" } } },
      },
    },
    orderBy: { date: "desc" },
  });

  // For each exercise in current workout, find the most recent session data
  const history: ExerciseHistoryEntry[] = exerciseNames.map((name, idx) => {
    const locations = exerciseLocations.get(name) || [];

    for (const log of recentLogs) {
      // Skip current session's own data (same assignment + workout)
      if (log.assignmentId === assignmentId && log.workoutIndex === workoutIndex) {
        // Only skip if this is the most recent — we still want older sessions from same workout
        continue;
      }

      for (const loc of locations) {
        if (log.assignmentId === loc.assignmentId && log.workoutIndex === loc.workoutIndex) {
          const sessionEx = log.exercises.find((e) => e.exerciseIndex === loc.exerciseIndex);
          if (sessionEx && sessionEx.setDetails.length > 0) {
            return {
              exerciseIndex: idx,
              lastSession: {
                date: log.date,
                sets: sessionEx.setDetails.map((s) => ({
                  reps: s.reps ?? 0,
                  weight: s.weight ?? 0,
                  duration: s.duration ?? 0,
                  distance: s.distance ?? 0,
                })),
              },
            };
          }
        }
      }
    }

    return { exerciseIndex: idx, lastSession: null };
  });

  return history;
}

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

  // Verify access: coach owns the client/athlete, or client owns the assignment
  const assignment = await db.assignment.findUnique({
    where: { id: data.assignmentId },
    include: {
      client: { select: { coachId: true, userId: true, id: true } },
      athlete: { include: { team: { select: { coachId: true } } } },
    },
  });

  if (!assignment) throw new Error("Assignment not found");

  const ownerCoachId = assignment.client?.coachId ?? assignment.athlete?.team?.coachId;
  const isCoach = session.user.role === "COACH" && ownerCoachId === session.user.id;
  const isClient = session.user.role === "CLIENT" && assignment.client?.userId === session.user.id;

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

  if (assignment.client) revalidatePath(`/clients/${assignment.client.id}`);
  if (assignment.athlete) revalidatePath(`/teams/${assignment.athlete.teamId}`);
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  revalidatePath("/progress");

  // Notify coach when client completes a session
  if (isClient && assignment.client) {
    try {
      const coach = await db.user.findUnique({
        where: { id: assignment.client.coachId! },
        select: { email: true },
      });
      const workoutName = await db.assignmentWorkout.findFirst({
        where: { assignmentId: data.assignmentId, order: data.workoutIndex },
        select: { name: true },
      });
      if (coach?.email) {
        const client = await db.client.findUnique({
          where: { id: assignment.client.id },
          select: { name: true },
        });
        await sendSessionCompletedEmail(
          coach.email,
          client?.name || "A client",
          workoutName?.name || "a workout",
          data.date
        );
      }
    } catch (e) {
      console.error("Failed to send session completed email:", e);
    }
  }

  return sessionLog;
}

export async function deleteSession(sessionLogId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const log = await db.sessionLog.findUnique({
    where: { id: sessionLogId },
    include: { assignment: { include: { client: { select: { coachId: true, id: true } }, athlete: { include: { team: { select: { coachId: true, id: true } } } } } } },
  });

  if (!log) throw new Error("Session not found");
  const logCoachId = log.assignment.client?.coachId ?? log.assignment.athlete?.team?.coachId;
  if (logCoachId !== session.user.id) throw new Error("Unauthorized");

  await db.sessionLog.delete({ where: { id: sessionLogId } });

  if (log.assignment.client) revalidatePath(`/clients/${log.assignment.client.id}`);
  if (log.assignment.athlete) revalidatePath(`/teams/${log.assignment.athlete.team.id}`);
  revalidatePath("/reports");
}

export async function updateSession(
  sessionLogId: string,
  data: {
    sessionNotes?: string;
    date?: Date;
    exercises: SessionExerciseInput[];
  }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const log = await db.sessionLog.findUnique({
    where: { id: sessionLogId },
    include: { assignment: { include: { client: { select: { coachId: true, id: true } }, athlete: { include: { team: { select: { coachId: true, id: true } } } } } } },
  });

  if (!log) throw new Error("Session not found");
  const updateCoachId = log.assignment.client?.coachId ?? log.assignment.athlete?.team?.coachId;
  if (updateCoachId !== session.user.id) throw new Error("Unauthorized");

  await db.$transaction(async (tx) => {
    // Delete existing exercises (cascade deletes sets)
    await tx.sessionExercise.deleteMany({ where: { sessionLogId } });

    // Update log and recreate exercises
    await tx.sessionLog.update({
      where: { id: sessionLogId },
      data: {
        sessionNotes: data.sessionNotes,
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
  });

  if (log.assignment.client) revalidatePath(`/clients/${log.assignment.client.id}`);
  if (log.assignment.athlete) revalidatePath(`/teams/${log.assignment.athlete.team.id}`);
  revalidatePath("/reports");
}
