"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExercise, updateExercise } from "@/lib/actions/exercises";
import { cn } from "@/lib/utils";

const muscleOptions = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Core",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Full Body",
];

type Exercise = {
  id: string;
  name: string;
  category: string;
  type: string;
  equipment: string | null;
  muscles: string[];
  instructions: string | null;
  tips: string | null;
  image: string | null;
};

export function ExerciseForm({ exercise }: { exercise?: Exercise }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: exercise?.name || "",
    category: exercise?.category || "Strength",
    type: exercise?.type || "weight",
    equipment: exercise?.equipment || "",
    muscles: exercise?.muscles || [],
    instructions: exercise?.instructions || "",
    tips: exercise?.tips || "",
    image: exercise?.image || "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleMuscle = (muscle: string) => {
    set(
      "muscles",
      form.muscles.includes(muscle)
        ? form.muscles.filter((m) => m !== muscle)
        : [...form.muscles, muscle]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => set("image", reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (exercise) {
        await updateExercise(exercise.id, {
          ...form,
          equipment: form.equipment || undefined,
          instructions: form.instructions || undefined,
          tips: form.tips || undefined,
          image: form.image || undefined,
        });
      } else {
        await createExercise({
          ...form,
          equipment: form.equipment || undefined,
          instructions: form.instructions || undefined,
          tips: form.tips || undefined,
          image: form.image || undefined,
        });
      }
      router.push("/exercises");
    } catch (error) {
      console.error("Failed to save exercise:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b border-border p-4 sticky top-0 z-10 -mx-4 -mt-4 mb-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/exercises">
                <ArrowLeft size={20} />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">
              {exercise ? "Edit Exercise" : "New Exercise"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/exercises">Cancel</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={!form.name || saving}>
              {saving ? "Saving..." : "Save Exercise"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Image Upload */}
          <div className="md:col-span-1">
            <Label className="mb-2 block">Exercise Image</Label>
            <div className="aspect-square bg-card rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative group">
              {form.image ? (
                <>
                  <img
                    src={form.image}
                    alt="Exercise"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => set("image", "")}
                    >
                      Remove
                    </Button>
                  </div>
                </>
              ) : (
                <label className="cursor-pointer text-center p-4">
                  <ImageIcon
                    size={32}
                    className="mx-auto text-muted-foreground mb-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    Click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 2MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Main Info */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <Label htmlFor="name">Exercise Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Barbell Back Squat"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => set("category", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strength">Strength</SelectItem>
                    <SelectItem value="Cardio">Cardio</SelectItem>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="Flexibility">Flexibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">Weight (sets/reps/lbs)</SelectItem>
                    <SelectItem value="cardio">
                      Cardio (duration/distance)
                    </SelectItem>
                    <SelectItem value="timed">Timed (duration)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="equipment">Equipment</Label>
              <Input
                id="equipment"
                placeholder="e.g., Barbell, Dumbbells, None"
                value={form.equipment}
                onChange={(e) => set("equipment", e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-2 block">Muscle Groups</Label>
              <div className="flex flex-wrap gap-2">
                {muscleOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMuscle(m)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm transition",
                      form.muscles.includes(m)
                        ? "bg-purple-600 text-white"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-purple-400" />
            <h3 className="font-semibold">How To Perform</h3>
          </div>
          <Textarea
            rows={4}
            placeholder="Step-by-step instructions for performing this exercise correctly..."
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
          />
        </div>

        {/* Tips */}
        <div className="mt-4 bg-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-yellow-400" />
            <h3 className="font-semibold">Coaching Tips & Common Mistakes</h3>
          </div>
          <Textarea
            rows={3}
            placeholder="Tips for coaches, common mistakes to watch for, cues to give clients..."
            value={form.tips}
            onChange={(e) => set("tips", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
