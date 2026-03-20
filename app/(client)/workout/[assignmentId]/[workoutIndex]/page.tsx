import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LiveSession } from "@/app/(coach)/session/[assignmentId]/[workoutIndex]/live-session";

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

  if (!assignment || assignment.client.userId !== session.user.id) {
    notFound();
  }

  const workout = assignment.workouts[workoutIndex];
  if (!workout) notFound();

  return (
    <LiveSession
      assignmentId={assignmentId}
      workoutIndex={workoutIndex}
      clientName={assignment.client.name}
      clientHealth={assignment.client.healthConditions}
      workoutName={workout.name}
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
      }))}
    />
  );
}
