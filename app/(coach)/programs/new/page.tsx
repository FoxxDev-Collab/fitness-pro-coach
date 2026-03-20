import { getExercises } from "@/lib/actions/exercises";
import { ProgramEditor } from "../program-editor";

export default async function NewProgramPage() {
  const exercises = await getExercises();

  return (
    <ProgramEditor
      exercises={exercises}
      program={{ name: "", description: "", workouts: [] }}
    />
  );
}
