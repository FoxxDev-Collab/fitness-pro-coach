"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Edit2, Trash2, ClipboardList, Dumbbell, Users, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
    (sum: number, w: Program["workouts"][number]) => sum + w.exercises.length,
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
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <Link href={`/programs/${program.id}/edit`} className="flex-1 min-w-0">
              <CardTitle className="text-lg">{program.name}</CardTitle>
              {program.description && (
                <CardDescription className="mt-1">{program.description}</CardDescription>
              )}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDuplicate} disabled={duplicating}>
                  <Copy className="size-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/programs/${program.id}/edit`}>
                    <Edit2 className="size-4 mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5">
              <ClipboardList className="size-3.5" /> {program.workouts.length} workouts
            </span>
            <span className="flex items-center gap-1.5">
              <Dumbbell className="size-3.5" /> {totalExercises} exercises
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" /> {program._count.assignments} assigned
            </span>
          </div>
          {program.workouts.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {program.workouts.map((w: Program["workouts"][number]) => (
                <Badge key={w.id} variant="secondary">
                  {w.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <AssignProgramToClientDialog program={program}>
            <Button size="sm">
              <Users className="size-4 mr-1.5" /> Assign
            </Button>
          </AssignProgramToClientDialog>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/programs/${program.id}/edit`}>Edit</Link>
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Program?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{program.name}&rdquo;. Existing client
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
