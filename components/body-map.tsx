"use client";

import { useState, useEffect } from "react";
import Model, { IExerciseData } from "react-body-highlighter";
import { cn } from "@/lib/utils";

type BodyMapProps = {
  activeMuscles: string[];
  className?: string;
  size?: "sm" | "md" | "lg";
};

// The CSS variables in app/globals.css are stored as full color expressions
// (e.g. `oklch(0.92 0.21 121)`), so we use the value verbatim — wrapping it
// again would produce invalid `oklch(oklch(...))` and the SVG would fall back
// to its default fill.
function normalizeColor(raw: string, fallback: string): string {
  const v = raw.trim();
  if (!v) return fallback;
  // Already a complete color expression — pass through.
  if (/^(oklch|oklab|rgb|rgba|hsl|hsla|color|#)/i.test(v)) return v;
  // Bare components (e.g. "0.92 0.21 121") — assume oklch and wrap.
  return `oklch(${v})`;
}

function useCssColor(cssVar: string, fallback: string): string {
  // Always start from the fallback so the server render and the client's first
  // (hydration) render agree. Reading getComputedStyle in the initializer made
  // the client's first render differ from the server's, producing an SVG
  // hydration mismatch that left the body map blank until a manual refresh.
  // The effect below resolves the real theme color right after mount.
  const [color, setColor] = useState(fallback);
  // Re-resolve on theme change (the .dark class is toggled on <html>)
  useEffect(() => {
    const root = document.documentElement;
    const resolve = () => {
      const computed = getComputedStyle(root).getPropertyValue(cssVar);
      setColor(normalizeColor(computed, fallback));
    };
    resolve();
    const observer = new MutationObserver(resolve);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [cssVar, fallback]);
  return color;
}

// Map our app's muscle names to react-body-highlighter muscle identifiers.
// Keys are matched case-insensitively after trimming. Include both canonical
// names used in the exercise form (Chest, Quads, ...) and common aliases that
// appear in the seed library or that a coach might enter for a custom
// exercise ("Legs", "Obliques", "Forearms").
const MUSCLE_MAP: Record<string, string[]> = {
  chest: ["chest"],
  back: ["upper-back", "lower-back"],
  "upper back": ["upper-back"],
  "lower back": ["lower-back"],
  shoulders: ["front-deltoids", "back-deltoids"],
  delts: ["front-deltoids", "back-deltoids"],
  deltoids: ["front-deltoids", "back-deltoids"],
  traps: ["trapezius"],
  trapezius: ["trapezius"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  forearm: ["forearm"],
  core: ["abs", "obliques"],
  abs: ["abs"],
  obliques: ["obliques"],
  quads: ["quadriceps"],
  quadriceps: ["quadriceps"],
  hamstrings: ["hamstring"],
  hamstring: ["hamstring"],
  glutes: ["gluteal"],
  gluteal: ["gluteal"],
  calves: ["calves"],
  legs: ["quadriceps", "hamstring", "gluteal", "calves"],
  "lower body": ["quadriceps", "hamstring", "gluteal", "calves"],
  "upper body": [
    "chest",
    "upper-back",
    "front-deltoids",
    "back-deltoids",
    "biceps",
    "triceps",
    "forearm",
  ],
  "full body": [
    "chest",
    "upper-back",
    "lower-back",
    "front-deltoids",
    "back-deltoids",
    "biceps",
    "triceps",
    "forearm",
    "abs",
    "obliques",
    "quadriceps",
    "hamstring",
    "gluteal",
    "calves",
  ],
};

const SIZE_STYLES = {
  sm: { width: "6rem" },
  md: { width: "9rem" },
  lg: { width: "12rem" },
};

function mapMusclesToData(activeMuscles: string[]): IExerciseData[] {
  const mapped = activeMuscles.flatMap(
    (m) => MUSCLE_MAP[m.trim().toLowerCase()] || []
  );
  // Deduplicate
  const unique = [...new Set(mapped)];

  if (unique.length === 0) return [];

  return [
    {
      name: "Workout",
      muscles: unique as IExerciseData["muscles"],
    },
  ];
}

// Check if any mapped muscles are on the posterior (back) view
const POSTERIOR_MUSCLES = new Set([
  "upper-back",
  "lower-back",
  "back-deltoids",
  "hamstring",
  "gluteal",
  "calves",
  "trapezius",
]);

export function BodyMap({
  activeMuscles,
  className,
  size = "md",
}: BodyMapProps) {
  const highlightColor = useCssColor("--primary", "#3b82f6");
  const bodyColor = useCssColor("--muted", "#e5e7eb");

  const data = mapMusclesToData(activeMuscles);
  if (data.length === 0) return null;

  const mappedMuscles = data[0].muscles;
  const hasFront = mappedMuscles.some((m) => !POSTERIOR_MUSCLES.has(m));
  const hasBack = mappedMuscles.some((m) => POSTERIOR_MUSCLES.has(m));

  const sizeStyle = SIZE_STYLES[size];

  return (
    <div className={cn("flex items-start justify-center gap-1", className)}>
      {(hasFront || !hasBack) && (
        <div className="flex flex-col items-center">
          <Model
            data={data}
            style={sizeStyle}
            highlightedColors={[highlightColor]}
            bodyColor={bodyColor}
          />
          <span className="text-[10px] text-muted-foreground font-medium tracking-wider mt-0.5">
            FRONT
          </span>
        </div>
      )}
      {hasBack && (
        <div className="flex flex-col items-center">
          <Model
            data={data}
            type="posterior"
            style={sizeStyle}
            highlightedColors={[highlightColor]}
            bodyColor={bodyColor}
          />
          <span className="text-[10px] text-muted-foreground font-medium tracking-wider mt-0.5">
            BACK
          </span>
        </div>
      )}
    </div>
  );
}

export function MuscleIndicator({ muscles }: { muscles: string[] }) {
  if (muscles.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <BodyMap activeMuscles={muscles} size="sm" />
    </div>
  );
}
