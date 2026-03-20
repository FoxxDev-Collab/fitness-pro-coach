import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getCoachId } from "@/lib/auth-utils";
import { LiveSession } from "./live-session";
import { getExerciseHistory } from "@/lib/actions/sessions";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ assignmentId: string; workoutIndex: string }>;
}) {
  const coachId = await getCoachId();
  const { assignmentId, workoutIndex } = await params;
  const workoutIdx = parseInt(workoutIndex);

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      client: true,
      athlete: { include: { team: { select: { coachId: true } } } },
      workouts: {
        include: {
          exercises: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!assignment || !assignment.workouts[workoutIdx]) {
    notFound();
  }

  // Verify coach ownership via client or athlete's team
  const ownerCoachId = assignment.client?.coachId ?? assignment.athlete?.team?.coachId;
  if (ownerCoachId !== coachId) {
    notFound();
  }

  const workout = assignment.workouts[workoutIdx];

  type WorkoutExercise = (typeof workout.exercises)[number];

  const previousData = await getExerciseHistory(assignmentId, workoutIdx);

  // Look up muscles for each exercise
  const exerciseIds = workout.exercises
    .map((e: WorkoutExercise) => e.exerciseId)
    .filter(Boolean) as string[];
  const exerciseRecords = exerciseIds.length > 0
    ? await db.exercise.findMany({
        where: { id: { in: exerciseIds } },
        select: { id: true, muscles: true },
      })
    : [];
  const muscleMap = new Map(exerciseRecords.map((e) => [e.id, e.muscles]));

  return (
    <LiveSession
      assignmentId={assignmentId}
      workoutIndex={workoutIdx}
      clientName={assignment.client?.name ?? assignment.athlete?.name ?? "Athlete"}
      clientHealth={assignment.client?.healthConditions ?? null}
      clientGender={assignment.client?.gender ?? assignment.athlete?.gender ?? null}
      workoutName={workout.name}
      previousData={previousData}
      exercises={workout.exercises.map((e: WorkoutExercise) => ({
        name: e.name,
        type: e.type,
        category: e.category,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        duration: e.duration,
        distance: e.distance,
        rest: e.rest,
        notes: e.notes,
        muscles: e.exerciseId ? muscleMap.get(e.exerciseId) || [] : [],
      }))}
    />
  );
}
