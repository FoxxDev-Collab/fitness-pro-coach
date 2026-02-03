"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createMeasurement } from "@/lib/actions/measurements";

export function MeasurementDialog({
  clientId,
  children,
}: {
  clientId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    weight: "",
    bodyFat: "",
    chest: "",
    waist: "",
    hips: "",
    arms: "",
    thighs: "",
  });

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await createMeasurement({
        clientId,
        date: new Date(form.date),
        weight: form.weight ? parseFloat(form.weight) : undefined,
        bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : undefined,
        chest: form.chest ? parseFloat(form.chest) : undefined,
        waist: form.waist ? parseFloat(form.waist) : undefined,
        hips: form.hips ? parseFloat(form.hips) : undefined,
        arms: form.arms ? parseFloat(form.arms) : undefined,
        thighs: form.thighs ? parseFloat(form.thighs) : undefined,
      });
      setOpen(false);
      setForm({
        date: new Date().toISOString().split("T")[0],
        weight: "",
        bodyFat: "",
        chest: "",
        waist: "",
        hips: "",
        arms: "",
        thighs: "",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to save measurement:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Measurements</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Weight (lbs)</Label>
              <Input
                type="number"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
              />
            </div>
            <div>
              <Label>Body Fat %</Label>
              <Input
                type="number"
                value={form.bodyFat}
                onChange={(e) => set("bodyFat", e.target.value)}
              />
            </div>
            <div>
              <Label>Chest (in)</Label>
              <Input
                type="number"
                value={form.chest}
                onChange={(e) => set("chest", e.target.value)}
              />
            </div>
            <div>
              <Label>Waist (in)</Label>
              <Input
                type="number"
                value={form.waist}
                onChange={(e) => set("waist", e.target.value)}
              />
            </div>
            <div>
              <Label>Hips (in)</Label>
              <Input
                type="number"
                value={form.hips}
                onChange={(e) => set("hips", e.target.value)}
              />
            </div>
            <div>
              <Label>Arms (in)</Label>
              <Input
                type="number"
                value={form.arms}
                onChange={(e) => set("arms", e.target.value)}
              />
            </div>
            <div>
              <Label>Thighs (in)</Label>
              <Input
                type="number"
                value={form.thighs}
                onChange={(e) => set("thighs", e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
