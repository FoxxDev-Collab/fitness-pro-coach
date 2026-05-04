"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { sendSessionCompletedEmail } from "@/lib/email";
import { cuid, parseInput } from "@/lib/validations";
import {
  saveSessionSchema,
  updateSessionSchema,
  type SaveSessionInput,
  type UpdateSessionInput,
} from "@/lib/validations/sessions";

function validateId(id: unknown, label: string): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error(`Invalid ${label}`);
  return parsed.data;
}

function validateWorkoutIndex(idx: unknown): number {
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx > 1000) {
    throw new Error("Invalid workout index");
  }
  return idx;
}

export type ExerciseHistoryEntry = {
  exerciseIndex: number;
  lastSession: {
    date: Date;
    sets: { reps: number; weight: number; duration: number; distance: number }[];
  } | null;
};

export async function getExerciseHistory(
  assignmentId: string,
  workoutIndex: number,
): Promise<ExerciseHistoryEntry[]> {
  const safeAssignmentId = validateId(assignmentId, "assignment id");
  const safeWorkoutIndex = validateWorkoutIndex(workoutIndex);

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  // Get the assignment and its exercises for this workout
  const assignment = await db.assignment.findUnique({
    where: { id: safeAssignmentId },
    include: {
      client: { select: { id: true, coachId: true, userId: true } },
      athlete: { include: { team: { select: { coachId: true } }, user: { select: { id: true } } } },
      workouts: {
        include: { exercises: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!assignment) return [];

  const ownerCoachId = assignment.client?.coachId ?? assignment.athlete?.team?.coachId;
  const ownerUserId = assignment.client?.userId ?? assignment.athlete?.user?.id;
  const isCoach = session.user.role === "COACH" && ownerCoachId === session.user.id;
  const isClient = session.user.role === "CLIENT" && ownerUserId === session.user.id;
  if (!isCoach && !isClient) throw new Error("Unauthorized");

  const workout = assignment.workouts[safeWorkoutIndex];
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
      if (log.assignmentId === safeAssignmentId && log.workoutIndex === safeWorkoutIndex) {
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

export async function saveSession(input: SaveSessionInput) {
  const parsed = parseInput(saveSessionSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const data = parsed.data;

  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  // Verify access: coach owns the client/athlete, or client/athlete owns the assignment
  const assignment = await db.assignment.findUnique({
    where: { id: data.assignmentId },
    include: {
      client: { select: { coachId: true, userId: true, id: true } },
      athlete: {
        include: {
          team: { select: { coachId: true } },
          user: { select: { id: true } },
        },
      },
    },
  });

  if (!assignment) throw new Error("Assignment not found");

  const ownerCoachId = assignment.client?.coachId ?? assignment.athlete?.team?.coachId;
  const ownerUserId = assignment.client?.userId ?? assignment.athlete?.user?.id;
  const isCoach = session.user.role === "COACH" && ownerCoachId === session.user.id;
  const isClient = session.user.role === "CLIENT" && ownerUserId === session.user.id;

  if (!isCoach && !isClient) throw new Error("Unauthorized");

  const sessionLog = await db.sessionLog.create({
    data: {
      assignmentId: data.assignmentId,
      workoutIndex: data.workoutIndex,
      sessionNotes: data.sessionNotes,
      duration: data.duration ?? null,
      date: data.date,
      exercises: {
        create: data.exercises.map((ex) => ({
          exerciseIndex: ex.exerciseIndex,
          sets: ex.sets ?? null,
          reps: ex.reps ?? null,
          weight: ex.weight ?? null,
          duration: ex.duration ?? null,
          distance: ex.distance ?? null,
          notes: ex.notes,
          setDetails: {
            create: ex.setDetails.map((s) => ({
              setNumber: s.setNumber,
              reps: s.reps ?? null,
              weight: s.weight ?? null,
              duration: s.duration ?? null,
              distance: s.distance ?? null,
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
          data.date,
        );
      }
    } catch (e) {
      console.error("Failed to send session completed email:", e);
    }
  }

  return sessionLog;
}

export async function deleteSession(sessionLogId: string) {
  const safeId = validateId(sessionLogId, "session id");
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const log = await db.sessionLog.findUnique({
    where: { id: safeId },
    include: { assignment: { include: { client: { select: { coachId: true, id: true } }, athlete: { include: { team: { select: { coachId: true, id: true } } } } } } },
  });

  if (!log) throw new Error("Session not found");
  const logCoachId = log.assignment.client?.coachId ?? log.assignment.athlete?.team?.coachId;
  if (logCoachId !== session.user.id) throw new Error("Unauthorized");

  await db.sessionLog.delete({ where: { id: safeId } });

  if (log.assignment.client) revalidatePath(`/clients/${log.assignment.client.id}`);
  if (log.assignment.athlete) revalidatePath(`/teams/${log.assignment.athlete.team.id}`);
  revalidatePath("/reports");
}

export async function updateSession(sessionLogId: string, input: UpdateSessionInput) {
  const safeId = validateId(sessionLogId, "session id");
  const parsed = parseInput(updateSessionSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const data = parsed.data;

  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") throw new Error("Unauthorized");

  const log = await db.sessionLog.findUnique({
    where: { id: safeId },
    include: { assignment: { include: { client: { select: { coachId: true, id: true } }, athlete: { include: { team: { select: { coachId: true, id: true } } } } } } },
  });

  if (!log) throw new Error("Session not found");
  const updateCoachId = log.assignment.client?.coachId ?? log.assignment.athlete?.team?.coachId;
  if (updateCoachId !== session.user.id) throw new Error("Unauthorized");

  await db.$transaction(async (tx) => {
    // Delete existing exercises (cascade deletes sets)
    await tx.sessionExercise.deleteMany({ where: { sessionLogId: safeId } });

    // Update log and recreate exercises
    await tx.sessionLog.update({
      where: { id: safeId },
      data: {
        sessionNotes: data.sessionNotes,
        date: data.date,
        exercises: {
          create: data.exercises.map((ex) => ({
            exerciseIndex: ex.exerciseIndex,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            weight: ex.weight ?? null,
            duration: ex.duration ?? null,
            distance: ex.distance ?? null,
            notes: ex.notes,
            setDetails: {
              create: ex.setDetails.map((s) => ({
                setNumber: s.setNumber,
                reps: s.reps ?? null,
                weight: s.weight ?? null,
                duration: s.duration ?? null,
                distance: s.distance ?? null,
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
