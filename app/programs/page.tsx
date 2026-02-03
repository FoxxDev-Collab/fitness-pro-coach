import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, ClipboardList, Dumbbell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgramCard } from "./program-card";

type ProgramWithRelations = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  workouts: {
    id: string;
    name: string;
    exercises: { id: string }[];
  }[];
  _count: { assignments: number };
};

export default async function ProgramsPage() {
  const programs: ProgramWithRelations[] = await db.program.findMany({
    orderBy: { name: "asc" },
    include: {
      workouts: {
        include: {
          exercises: true,
        },
        orderBy: { order: "asc" },
      },
      _count: {
        select: { assignments: true },
      },
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Programs</h2>
          <p className="text-muted-foreground text-sm">
            {programs.length} program{programs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/programs/new">
            <Plus size={20} className="mr-2" />
            New Program
          </Link>
        </Button>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border-2 border-dashed border-border">
          <ClipboardList
            size={48}
            className="mx-auto text-muted-foreground mb-4"
          />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No programs yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Create your first workout program to get started
          </p>
          <Button asChild>
            <Link href="/programs/new">
              <Plus size={18} className="mr-2" />
              Create Program
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      )}
    </div>
  );
}
