"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Exercise = {
  id: string;
  name: string;
  category: string;
  type: string;
  equipment: string | null;
  muscles: string[];
  image: string | null;
  custom: boolean;
};

export function ExerciseFilters({
  exercises,
  categories,
}: {
  exercises: Exercise[];
  categories: string[];
}) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = exercises.filter(
    (e: Exercise) =>
      (filter === "All" || e.category === filter) &&
      (search === "" || e.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Button
          variant={filter === "All" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("All")}
        >
          All
        </Button>
        {categories.map((c: string) => (
          <Button
            key={c}
            variant={filter === c ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No exercises found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((e: Exercise) => (
            <Link
              key={e.id}
              href={`/exercises/${e.id}`}
              className="flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent group"
            >
              <div className="size-14 bg-muted rounded-md flex items-center justify-center shrink-0 overflow-hidden">
                {e.image ? (
                  <img
                    src={e.image}
                    alt={e.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Dumbbell className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {e.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {e.category} · {e.equipment || "No equipment"}
                    </p>
                  </div>
                  {e.custom && (
                    <Badge variant="secondary">Custom</Badge>
                  )}
                </div>
                {e.muscles?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {e.muscles.join(", ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
