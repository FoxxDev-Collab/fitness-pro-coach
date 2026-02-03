import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ExerciseForm } from "../../exercise-form";

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = await db.exercise.findUnique({ where: { id } });

  if (!exercise) {
    notFound();
  }

  return <ExerciseForm exercise={exercise} />;
}
