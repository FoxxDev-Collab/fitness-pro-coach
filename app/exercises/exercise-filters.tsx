"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("All")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm transition",
            filter === "All"
              ? "bg-purple-600 text-white"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          All
        </button>
        {categories.map((c: string) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition",
              filter === c
                ? "bg-purple-600 text-white"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border-2 border-dashed border-border">
          <Dumbbell size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No exercises found</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((e: Exercise) => (
            <Link
              key={e.id}
              href={`/exercises/${e.id}`}
              className="bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 border border-transparent hover:border-purple-500/50 transition group"
            >
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {e.image ? (
                    <img
                      src={e.image}
                      alt={e.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Dumbbell size={24} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold group-hover:text-purple-400 transition">
                        {e.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {e.category} · {e.equipment || "No equipment"}
                      </p>
                    </div>
                    {e.custom && (
                      <Badge variant="secondary" className="text-purple-400">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {e.muscles?.join(", ")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
