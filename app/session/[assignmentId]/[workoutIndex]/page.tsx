import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { LiveSession } from "./live-session";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ assignmentId: string; workoutIndex: string }>;
}) {
  const { assignmentId, workoutIndex } = await params;
  const workoutIdx = parseInt(workoutIndex);

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      client: true,
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

  const workout = assignment.workouts[workoutIdx];

  type WorkoutExercise = (typeof workout.exercises)[number];

  return (
    <LiveSession
      assignmentId={assignmentId}
      workoutIndex={workoutIdx}
      clientName={assignment.client.name}
      clientHealth={assignment.client.healthConditions}
      workoutName={workout.name}
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
      }))}
    />
  );
}
