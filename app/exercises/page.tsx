import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExerciseFilters } from "./exercise-filters";

export default async function ExercisesPage() {
  const exercises = await db.exercise.findMany({
    orderBy: [{ custom: "asc" }, { name: "asc" }],
  });

  const categories = [...new Set(exercises.map((e) => e.category))];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Exercise Library</h2>
          <p className="text-muted-foreground text-sm">
            {exercises.length} exercises
          </p>
        </div>
        <Button asChild>
          <Link href="/exercises/new">
            <Plus size={20} className="mr-2" />
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
