import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProgramEditor } from "../../program-editor";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [program, exercises] = await Promise.all([
    db.program.findUnique({
      where: { id },
      include: {
        workouts: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.exercise.findMany({
      orderBy: [{ custom: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!program) {
    notFound();
  }

  // Transform to editor format
  const editorProgram = {
    id: program.id,
    name: program.name,
    description: program.description || "",
    workouts: program.workouts.map((w) => ({
      id: w.id,
      name: w.name,
      exercises: w.exercises.map((we) => ({
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
