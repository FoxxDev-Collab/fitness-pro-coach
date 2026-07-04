import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { requirePortal } from "@/lib/auth-utils";
import { normalizeEmail } from "@/lib/portal/linking";
import { LiveSession } from "@/app/(coach)/session/[assignmentId]/[workoutIndex]/live-session";
import { getExerciseHistory } from "@/lib/actions/sessions";

export default async function PortalWorkoutPage({
  params,
}: {
  params: Promise<{ assignmentId: string; workoutIndex: string }>;
}) {
  const session = await requirePortal();
  const email = normalizeEmail(session.user.email);

  const { assignmentId, workoutIndex: workoutIndexStr } = await params;
  const workoutIndex = parseInt(workoutIndexStr, 10);

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      athlete: { select: { email: true, name: true, gender: true } },
      workouts: { include: { exercises: true }, orderBy: { order: "asc" } },
    },
  });

  // Athlete-self only: the viewer's login email must match this athlete's own
  // roster email. Parents (parentEmail match) never reach here.
  if (
    !assignment ||
    !assignment.athlete ||
    !email ||
    normalizeEmail(assignment.athlete.email) !== email
  ) {
    notFound();
  }

  const workout = assignment.workouts[workoutIndex];
  if (!workout) notFound();

  const previousData = await getExerciseHistory(assignmentId, workoutIndex);

  const exerciseIds = workout.exercises
    .map((e) => e.exerciseId)
    .filter(Boolean) as string[];
  const exerciseRecords =
    exerciseIds.length > 0
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
      clientName={assignment.athlete.name}
      clientHealth={null}
      workoutName={workout.name}
      previousData={previousData}
      returnTo="/portal"
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
