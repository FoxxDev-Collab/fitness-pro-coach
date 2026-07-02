"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { assignProgram } from "@/lib/actions/assignments";

type Program = {
  id: string;
  name: string;
  workouts: { id: string }[];
};

export function AssignProgramDialog({
  clientId,
  clientName,
  healthConditions,
  children,
}: {
  clientId: string;
  clientName: string;
  healthConditions?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetch("/api/programs")
        .then((res) => res.json())
        .then(setPrograms)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedProgram) return;
    setSaving(true);
    try {
      await assignProgram({
        clientId,
        programId: selectedProgram.id,
        name: `${selectedProgram.name} - ${clientName}`,
        startDate: new Date(startDate),
      });
      setOpen(false);
      setSelectedProgram(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to assign program:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedProgram ? "Assign Program" : "Select Program"}
          </DialogTitle>
        </DialogHeader>

        {selectedProgram ? (
          <div className="space-y-4">
            {healthConditions && (
              <div className="flex gap-2.5 rounded-md border border-warning/50 bg-warning/10 p-3">
                <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {clientName}&apos;s Conditions
                  </p>
                  <p className="text-sm text-muted-foreground">{healthConditions}</p>
                </div>
              </div>
            )}
            <p>
              Assigning <strong>{selectedProgram.name}</strong> to{" "}
              <strong>{clientName}</strong>
            </p>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedProgram(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleAssign}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        ) : loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : programs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No programs available. Create a program first.
          </p>
        ) : (
          <div className="space-y-2">
            {programs.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProgram(p)}
                className="w-full bg-muted hover:bg-muted/80 rounded p-3 text-left transition"
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.workouts?.length || 0} workouts
                </p>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
