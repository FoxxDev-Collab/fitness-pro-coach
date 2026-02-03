import { db } from "@/lib/db";
import { ProgramEditor } from "../program-editor";

export default async function NewProgramPage() {
  const exercises = await db.exercise.findMany({
    orderBy: [{ custom: "asc" }, { name: "asc" }],
  });

  return (
    <ProgramEditor
      exercises={exercises}
      program={{ name: "", description: "", workouts: [] }}
    />
  );
}
