"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Edit2, Trash2, ClipboardList, Dumbbell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteProgram, duplicateProgram } from "@/lib/actions/programs";
import { AssignProgramToClientDialog } from "./assign-to-client-dialog";

type Program = {
  id: string;
  name: string;
  description: string | null;
  workouts: {
    id: string;
    name: string;
    exercises: { id: string }[];
  }[];
  _count: {
    assignments: number;
  };
};

export function ProgramCard({ program }: { program: Program }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const totalExercises = program.workouts.reduce(
    (sum, w) => sum + w.exercises.length,
    0
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProgram(program.id);
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      await duplicateProgram(program.id);
      router.refresh();
    } catch (error) {
      console.error("Failed to duplicate:", error);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl p-5 hover:bg-card/80 transition group">
        <div className="flex justify-between items-start mb-3">
          <Link href={`/programs/${program.id}/edit`} className="flex-1">
            <h3 className="text-xl font-semibold group-hover:text-purple-400 transition">
              {program.name}
            </h3>
            {program.description && (
              <p className="text-muted-foreground text-sm mt-1">
                {program.description}
              </p>
            )}
          </Link>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleDuplicate}
              disabled={duplicating}
              title="Duplicate"
            >
              <Copy size={16} />
            </Button>
            <Button variant="secondary" size="icon" asChild title="Edit">
              <Link href={`/programs/${program.id}/edit`}>
                <Edit2 size={16} />
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              title="Delete"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <ClipboardList size={14} /> {program.workouts.length} workouts
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell size={14} /> {totalExercises} exercises
          </span>
          <span className="flex items-center gap-1">
            <User size={14} /> {program._count.assignments} assigned
          </span>
        </div>
        {program.workouts.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {program.workouts.map((w) => (
              <Badge key={w.id} variant="secondary">
                {w.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <AssignProgramToClientDialog program={program}>
            <Button
              size="sm"
              className="bg-green-700 hover:bg-green-600"
            >
              <User size={16} className="mr-1" /> Assign
            </Button>
          </AssignProgramToClientDialog>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/programs/${program.id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Program?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{program.name}". Existing client
              assignments will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
