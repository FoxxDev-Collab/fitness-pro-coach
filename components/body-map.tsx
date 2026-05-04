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
  const [color, setColor] = useState(() => {
    if (typeof window === "undefined") return fallback;
    const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVar);
    return normalizeColor(computed, fallback);
  });
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

// Map our app's muscle names to react-body-highlighter muscle identifiers
const MUSCLE_MAP: Record<string, string[]> = {
  Chest: ["chest"],
  Back: ["upper-back", "lower-back"],
  Shoulders: ["front-deltoids", "back-deltoids"],
  Biceps: ["biceps"],
  Triceps: ["triceps"],
  Core: ["abs", "obliques"],
  Quads: ["quadriceps"],
  Hamstrings: ["hamstring"],
  Glutes: ["gluteal"],
  Calves: ["calves"],
  "Full Body": [
    "chest",
    "upper-back",
    "lower-back",
    "front-deltoids",
    "back-deltoids",
    "biceps",
    "triceps",
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
    (m) => MUSCLE_MAP[m.trim()] || []
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
