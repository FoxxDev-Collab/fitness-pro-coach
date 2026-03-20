"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTeam, updateTeam } from "@/lib/actions/teams";

type Team = {
  id: string;
  name: string;
  sport: string | null;
  season: string | null;
  description: string | null;
};

export function TeamFormDialog({
  team,
  children,
}: {
  team?: Team;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: team?.name || "",
    sport: team?.sport || "",
    season: team?.season || "",
    description: team?.description || "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (team) {
        await updateTeam(team.id, {
          ...form,
          sport: form.sport || undefined,
          season: form.season || undefined,
          description: form.description || undefined,
        });
      } else {
        await createTeam({
          ...form,
          sport: form.sport || undefined,
          season: form.season || undefined,
          description: form.description || undefined,
        });
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to save team:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{team ? "Edit Team" : "Create Team"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="team-name">Team Name *</Label>
            <Input
              id="team-name"
              placeholder="e.g. Varsity Football"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sport">Sport</Label>
            <Input
              id="sport"
              placeholder="e.g. Football, Basketball, Soccer"
              value={form.sport}
              onChange={(e) => set("sport", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="season">Season</Label>
            <Input
              id="season"
              placeholder="e.g. Spring 2026, Fall 2026"
              value={form.season}
              onChange={(e) => set("season", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Team notes, goals, etc."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!form.name || saving}
            className="w-full"
          >
            {saving ? "Saving..." : team ? "Save" : "Create Team"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
