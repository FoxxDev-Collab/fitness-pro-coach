import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LiveSession } from "@/app/(coach)/session/[assignmentId]/[workoutIndex]/live-session";
import { getExerciseHistory } from "@/lib/actions/sessions";

export default async function ClientWorkoutPage({
  params,
}: {
  params: Promise<{ assignmentId: string; workoutIndex: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") redirect("/login");

  const { assignmentId, workoutIndex: workoutIndexStr } = await params;
  const workoutIndex = parseInt(workoutIndexStr);

  // Verify this assignment belongs to the logged-in client
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      client: { select: { userId: true, name: true, healthConditions: true } },
      workouts: {
        include: { exercises: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!assignment || !assignment.client || assignment.client.userId !== session.user.id) {
    notFound();
  }

  const workout = assignment.workouts[workoutIndex];
  if (!workout) notFound();

  const previousData = await getExerciseHistory(assignmentId, workoutIndex);

  // Look up muscles for each exercise
  const exerciseIds = workout.exercises
    .map((e) => e.exerciseId)
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
      workoutIndex={workoutIndex}
      clientName={assignment.client.name}
      clientHealth={assignment.client.healthConditions}
      workoutName={workout.name}
      previousData={previousData}
      exercises={workout.exercises.map((e) => ({
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
