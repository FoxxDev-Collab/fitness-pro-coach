"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient, updateClient } from "@/lib/actions/clients";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  goals: string | null;
  healthConditions: string | null;
  notes: string | null;
  active: boolean;
};

export function ClientFormDialog({
  client,
  children,
}: {
  client?: Client;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: client?.name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    goals: client?.goals || "",
    healthConditions: client?.healthConditions || "",
    notes: client?.notes || "",
    active: client?.active ?? true,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (client) {
        await updateClient(client.id, {
          ...form,
          email: form.email || undefined,
          phone: form.phone || undefined,
          goals: form.goals || undefined,
          healthConditions: form.healthConditions || undefined,
          notes: form.notes || undefined,
        });
      } else {
        await createClient({
          ...form,
          email: form.email || undefined,
          phone: form.phone || undefined,
          goals: form.goals || undefined,
          healthConditions: form.healthConditions || undefined,
          notes: form.notes || undefined,
        });
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to save client:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="goals">Goals</Label>
            <Input
              id="goals"
              placeholder="Goals"
              value={form.goals}
              onChange={(e) => set("goals", e.target.value)}
            />
          </div>
          <div>
            <Label className="text-yellow-400 flex items-center gap-1 mb-1">
              <AlertTriangle size={14} /> Health Conditions
            </Label>
            <Textarea
              rows={2}
              placeholder="Injuries, conditions..."
              value={form.healthConditions}
              onChange={(e) => set("healthConditions", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="active"
              checked={form.active}
              onCheckedChange={(checked) => set("active", !!checked)}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active
            </Label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!form.name || saving}
            className="w-full"
          >
            {saving ? "Saving..." : client ? "Save" : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
