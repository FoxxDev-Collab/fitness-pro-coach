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
};

type Client = {
  id: string;
  name: string;
  healthConditions: string | null;
  active: boolean;
};

export function AssignProgramToClientDialog({
  program,
  children,
}: {
  program: Program;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetch("/api/clients")
        .then((res) => res.json())
        .then(setClients)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      await assignProgram({
        clientId: selectedClient.id,
        programId: program.id,
        name: `${program.name} - ${selectedClient.name}`,
        startDate: new Date(startDate),
      });
      setOpen(false);
      setSelectedClient(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to assign program:", error);
    } finally {
      setSaving(false);
    }
  };

  const activeClients = clients.filter((c: Client) => c.active);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedClient ? "Assign Program" : "Select Client"}
          </DialogTitle>
        </DialogHeader>

        {selectedClient ? (
          <div className="space-y-4">
            {selectedClient.healthConditions && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 flex gap-2">
                <AlertTriangle
                  className="text-yellow-500 shrink-0"
                  size={20}
                />
                <div>
                  <p className="font-medium text-yellow-400 text-sm">
                    {selectedClient.name}'s Conditions
                  </p>
                  <p className="text-sm">{selectedClient.healthConditions}</p>
                </div>
              </div>
            )}
            <p>
              Assigning <strong>{program.name}</strong> to{" "}
              <strong>{selectedClient.name}</strong>
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
                onClick={() => setSelectedClient(null)}
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
        ) : activeClients.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No active clients. Add a client first.
          </p>
        ) : (
          <div className="space-y-2">
            {activeClients.map((c: Client) => (
              <button
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className="w-full bg-muted hover:bg-muted/80 rounded p-3 text-left transition flex justify-between items-center"
              >
                <p className="font-medium">{c.name}</p>
                {c.healthConditions && (
                  <AlertTriangle className="text-yellow-500" size={18} />
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
