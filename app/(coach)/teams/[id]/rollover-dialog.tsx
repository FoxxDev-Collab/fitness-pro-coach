"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { rolloverTeam } from "@/lib/actions/teams";

export function RolloverDialog({
  teamId,
  teamName,
  teamSport,
}: {
  teamId: string;
  teamName: string;
  teamSport: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: teamName,
    season: "",
    sport: teamSport || "",
    keepAthletes: true,
  });

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const newTeam = await rolloverTeam(teamId, {
        name: form.name,
        season: form.season || undefined,
        sport: form.sport || undefined,
        keepAthletes: form.keepAthletes,
      });
      setOpen(false);
      router.push(`/teams/${newTeam.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="size-4 mr-1.5" /> New Season
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Season</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will archive <strong>{teamName}</strong> and create a new team
          for the next season.
        </p>
        <div className="space-y-4">
          <div>
            <Label>Team Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label>New Season</Label>
            <Input
              placeholder="e.g. Fall 2026"
              value={form.season}
              onChange={(e) =>
                setForm((f) => ({ ...f, season: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Sport</Label>
            <Input
              value={form.sport}
              onChange={(e) =>
                setForm((f) => ({ ...f, sport: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="keepAthletes"
              checked={form.keepAthletes}
              onCheckedChange={(c) =>
                setForm((f) => ({ ...f, keepAthletes: !!c }))
              }
            />
            <Label htmlFor="keepAthletes" className="cursor-pointer">
              Carry over athletes to new season
            </Label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!form.name || saving}
            className="w-full"
          >
            {saving ? "Creating..." : "Create New Season"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
