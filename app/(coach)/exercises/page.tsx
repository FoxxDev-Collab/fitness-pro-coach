import { getExercises } from "@/lib/actions/exercises";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseFilters } from "./exercise-filters";

type Exercise = {
  id: string;
  name: string;
  category: string;
  type: string;
  equipment: string | null;
  muscles: string[];
  instructions: string | null;
  tips: string | null;
  image: string | null;
  custom: boolean;
  createdAt: Date;
};

export default async function ExercisesPage() {
  const exercises: Exercise[] = await getExercises();

  const categories: string[] = [...new Set(exercises.map((e: Exercise) => e.category))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exercise Library</h1>
          <p className="text-sm text-muted-foreground">
            {exercises.length} exercises
          </p>
        </div>
        <Button asChild>
          <Link href="/exercises/new">
            <Plus className="size-4 mr-2" />
            New Exercise
          </Link>
        </Button>
      </div>

      <ExerciseFilters
        exercises={exercises}
        categories={categories}
      />
    </div>
  );
}
