import { getProgram } from "@/lib/actions/programs";
import { getExercises } from "@/lib/actions/exercises";
import { notFound } from "next/navigation";
import { ProgramEditor } from "../../program-editor";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [program, exercises] = await Promise.all([
    getProgram(id),
    getExercises(),
  ]);

  if (!program) {
    notFound();
  }

  // Transform to editor format
  type ProgramWorkout = NonNullable<typeof program>["workouts"][number];
  type WorkoutExercise = ProgramWorkout["exercises"][number];

  const editorProgram = {
    id: program.id,
    name: program.name,
    description: program.description || "",
    workouts: program.workouts.map((w: ProgramWorkout) => ({
      id: w.id,
      name: w.name,
      exercises: w.exercises.map((we: WorkoutExercise) => ({
        id: we.id,
        exerciseId: we.exerciseId,
        name: we.exercise.name,
        type: we.exercise.type,
        category: we.exercise.category,
        sets: we.sets,
        reps: we.reps,
        weight: we.weight,
        duration: we.duration,
        distance: we.distance,
        rest: we.rest,
        notes: we.notes || "",
      })),
    })),
  };

  return <ProgramEditor exercises={exercises} program={editorProgram} />;
}
