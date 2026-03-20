"use client";

import { cn } from "@/lib/utils";

type BodyMapProps = {
  activeMuscles: string[];
  className?: string;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
};

const SIZE_MAP = {
  sm: { width: 120, height: 280 },
  md: { width: 160, height: 370 },
  lg: { width: 200, height: 460 },
};

// Map muscle names to SVG path definitions for front and back views
// Each muscle group has paths for front view, back view, or both
const MUSCLE_PATHS: Record<
  string,
  { front?: string[]; back?: string[]; label: { x: number; y: number; view: "front" | "back" } }
> = {
  Chest: {
    front: [
      // Left pec
      "M 62,95 Q 58,88 50,86 Q 42,88 40,95 Q 38,102 42,108 Q 48,112 56,110 Q 62,106 62,95 Z",
      // Right pec
      "M 78,95 Q 82,88 90,86 Q 98,88 100,95 Q 102,102 98,108 Q 92,112 84,110 Q 78,106 78,95 Z",
    ],
    label: { x: 70, y: 100, view: "front" },
  },
  Back: {
    back: [
      // Upper back / lats - left
      "M 42,88 Q 38,95 36,108 Q 34,118 38,128 Q 44,132 50,128 Q 54,120 54,110 Q 54,98 50,90 Q 46,86 42,88 Z",
      // Upper back / lats - right
      "M 98,88 Q 102,95 104,108 Q 106,118 102,128 Q 96,132 90,128 Q 86,120 86,110 Q 86,98 90,90 Q 94,86 98,88 Z",
      // Spine / mid-back
      "M 64,86 L 76,86 Q 78,100 78,115 Q 78,125 76,132 L 64,132 Q 62,125 62,115 Q 62,100 64,86 Z",
    ],
    label: { x: 70, y: 110, view: "back" },
  },
  Shoulders: {
    front: [
      // Left delt
      "M 40,80 Q 32,78 28,84 Q 26,92 30,98 Q 34,100 38,96 Q 40,90 40,80 Z",
      // Right delt
      "M 100,80 Q 108,78 112,84 Q 114,92 110,98 Q 106,100 102,96 Q 100,90 100,80 Z",
    ],
    back: [
      // Rear delt left
      "M 40,80 Q 32,78 28,84 Q 26,92 30,98 Q 34,100 38,96 Q 40,90 40,80 Z",
      // Rear delt right
      "M 100,80 Q 108,78 112,84 Q 114,92 110,98 Q 106,100 102,96 Q 100,90 100,80 Z",
    ],
    label: { x: 28, y: 88, view: "front" },
  },
  Biceps: {
    front: [
      // Left bicep
      "M 30,100 Q 26,108 24,118 Q 22,128 24,134 Q 28,138 32,134 Q 36,126 36,116 Q 36,108 34,100 Z",
      // Right bicep
      "M 110,100 Q 114,108 116,118 Q 118,128 116,134 Q 112,138 108,134 Q 104,126 104,116 Q 104,108 106,100 Z",
    ],
    label: { x: 24, y: 118, view: "front" },
  },
  Triceps: {
    back: [
      // Left tricep
      "M 32,100 Q 28,108 26,118 Q 24,128 26,136 Q 30,140 34,136 Q 38,128 38,118 Q 38,108 36,100 Z",
      // Right tricep
      "M 108,100 Q 112,108 114,118 Q 116,128 114,136 Q 110,140 106,136 Q 102,128 102,118 Q 102,108 104,100 Z",
    ],
    label: { x: 26, y: 118, view: "back" },
  },
  Core: {
    front: [
      // Abs
      "M 58,112 L 82,112 Q 84,125 84,138 Q 84,150 82,160 L 58,160 Q 56,150 56,138 Q 56,125 58,112 Z",
    ],
    label: { x: 70, y: 138, view: "front" },
  },
  Quads: {
    front: [
      // Left quad
      "M 50,168 Q 46,180 44,196 Q 42,212 42,228 Q 42,240 46,248 Q 50,252 54,248 Q 58,238 60,224 Q 62,210 62,196 Q 62,180 58,168 Z",
      // Right quad
      "M 90,168 Q 94,180 96,196 Q 98,212 98,228 Q 98,240 94,248 Q 90,252 86,248 Q 82,238 80,224 Q 78,210 78,196 Q 78,180 82,168 Z",
    ],
    label: { x: 48, y: 210, view: "front" },
  },
  Hamstrings: {
    back: [
      // Left hamstring
      "M 50,170 Q 46,182 44,198 Q 42,214 42,230 Q 42,242 46,250 Q 50,254 54,250 Q 58,240 60,226 Q 62,212 62,198 Q 62,182 58,170 Z",
      // Right hamstring
      "M 90,170 Q 94,182 96,198 Q 98,214 98,230 Q 98,242 94,250 Q 90,254 86,250 Q 82,240 80,226 Q 78,212 78,198 Q 78,182 82,170 Z",
    ],
    label: { x: 48, y: 212, view: "back" },
  },
  Glutes: {
    back: [
      // Left glute
      "M 50,148 Q 44,152 40,160 Q 38,168 42,174 Q 48,178 56,176 Q 62,172 64,166 Q 64,158 60,152 Q 56,148 50,148 Z",
      // Right glute
      "M 90,148 Q 96,152 100,160 Q 102,168 98,174 Q 92,178 84,176 Q 78,172 76,166 Q 76,158 80,152 Q 84,148 90,148 Z",
    ],
    label: { x: 70, y: 164, view: "back" },
  },
  Calves: {
    back: [
      // Left calf
      "M 44,256 Q 42,266 42,278 Q 42,290 44,300 Q 48,308 52,304 Q 56,296 56,284 Q 56,272 54,260 Q 52,254 48,254 Z",
      // Right calf
      "M 96,256 Q 98,266 98,278 Q 98,290 96,300 Q 92,308 88,304 Q 84,296 84,284 Q 84,272 86,260 Q 88,254 92,254 Z",
    ],
    label: { x: 48, y: 282, view: "back" },
  },
  "Full Body": {
    front: [
      // Just highlight the whole torso area lightly
      "M 40,80 Q 28,84 26,98 Q 22,118 24,138 Q 28,142 38,140 Q 42,150 44,164 Q 42,190 42,220 Q 42,248 46,260 Q 50,268 54,260 Q 58,248 62,230 Q 64,210 64,190 Q 64,166 62,150 Q 70,148 78,150 Q 76,166 76,190 Q 76,210 78,230 Q 82,248 86,260 Q 90,268 94,260 Q 98,248 98,220 Q 98,190 96,164 Q 98,150 102,140 Q 112,142 116,138 Q 118,118 114,98 Q 112,84 100,80 Q 92,76 82,74 Q 74,72 70,72 Q 66,72 58,74 Q 48,76 40,80 Z",
    ],
    label: { x: 70, y: 140, view: "front" },
  },
};

// Body outline paths
const BODY_OUTLINE_FRONT =
  "M 70,12 Q 60,12 56,18 Q 52,24 52,32 Q 52,40 56,46 Q 58,50 58,54 Q 54,58 48,62 Q 40,66 36,72 Q 30,78 26,86 Q 22,96 22,108 Q 20,120 22,132 Q 24,140 28,144 Q 20,148 18,156 Q 16,164 18,172 L 20,176 Q 30,144 38,140 Q 42,148 44,160 Q 42,170 40,184 Q 38,200 38,220 Q 38,240 42,256 Q 44,264 46,270 Q 48,278 48,286 Q 48,296 46,306 Q 44,316 44,322 Q 44,330 48,334 L 60,334 Q 62,330 62,322 Q 62,312 60,300 Q 58,288 58,276 Q 58,264 60,252 Q 62,240 64,226 Q 66,212 66,198 Q 66,184 66,170 Q 66,160 68,152 L 70,148 L 72,152 Q 74,160 74,170 Q 74,184 74,198 Q 74,212 76,226 Q 78,240 80,252 Q 82,264 82,276 Q 82,288 80,300 Q 78,312 78,322 Q 78,330 80,334 L 92,334 Q 96,330 96,322 Q 96,316 94,306 Q 92,296 92,286 Q 92,278 94,270 Q 96,264 98,256 Q 102,240 102,220 Q 102,200 100,184 Q 98,170 96,160 Q 98,148 102,140 Q 110,144 120,176 L 122,172 Q 124,164 122,156 Q 120,148 112,144 Q 116,140 118,132 Q 120,120 118,108 Q 118,96 114,86 Q 110,78 104,72 Q 100,66 92,62 Q 86,58 82,54 Q 82,50 84,46 Q 88,40 88,32 Q 88,24 84,18 Q 80,12 70,12 Z";

const BODY_OUTLINE_BACK =
  "M 70,12 Q 60,12 56,18 Q 52,24 52,32 Q 52,40 56,46 Q 58,50 58,54 Q 54,58 48,62 Q 40,66 36,72 Q 30,78 26,86 Q 22,96 22,108 Q 20,120 22,132 Q 24,140 28,144 Q 20,148 18,156 Q 16,164 18,172 L 20,176 Q 30,144 38,140 Q 42,148 44,160 Q 42,170 40,184 Q 38,200 38,220 Q 38,240 42,256 Q 44,264 46,270 Q 48,278 48,286 Q 48,296 46,306 Q 44,316 44,322 Q 44,330 48,334 L 60,334 Q 62,330 62,322 Q 62,312 60,300 Q 58,288 58,276 Q 58,264 60,252 Q 62,240 64,226 Q 66,212 66,198 Q 66,184 66,170 Q 66,160 68,152 L 70,148 L 72,152 Q 74,160 74,170 Q 74,184 74,198 Q 74,212 76,226 Q 78,240 80,252 Q 82,264 82,276 Q 82,288 80,300 Q 78,312 78,322 Q 78,330 80,334 L 92,334 Q 96,330 96,322 Q 96,316 94,306 Q 92,296 92,286 Q 92,278 94,270 Q 96,264 98,256 Q 102,240 102,220 Q 102,200 100,184 Q 98,170 96,160 Q 98,148 102,140 Q 110,144 120,176 L 122,172 Q 124,164 122,156 Q 120,148 112,144 Q 116,140 118,132 Q 120,120 118,108 Q 118,96 114,86 Q 110,78 104,72 Q 100,66 92,62 Q 86,58 82,54 Q 82,50 84,46 Q 88,40 88,32 Q 88,24 84,18 Q 80,12 70,12 Z";

function BodySvg({
  view,
  activeMuscles,
  width,
  height,
  showLabels,
}: {
  view: "front" | "back";
  activeMuscles: string[];
  width: number;
  height: number;
  showLabels: boolean;
}) {
  const normalizedActive = activeMuscles.map((m) => m.trim());

  return (
    <svg
      viewBox="0 0 140 346"
      width={width}
      height={height}
      className="select-none"
    >
      {/* Body outline */}
      <path
        d={view === "front" ? BODY_OUTLINE_FRONT : BODY_OUTLINE_BACK}
        className="fill-muted/40 stroke-border"
        strokeWidth={1.2}
      />

      {/* Muscle groups */}
      {Object.entries(MUSCLE_PATHS).map(([name, data]) => {
        const paths = view === "front" ? data.front : data.back;
        if (!paths) return null;

        const isActive = normalizedActive.includes(name);

        return (
          <g key={`${view}-${name}`}>
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                className={cn(
                  "transition-all duration-300",
                  isActive
                    ? "fill-primary/60 stroke-primary"
                    : "fill-transparent stroke-transparent"
                )}
                strokeWidth={isActive ? 1 : 0}
              />
            ))}
            {/* Label */}
            {showLabels && isActive && data.label.view === view && (
              <text
                x={data.label.x}
                y={data.label.y}
                textAnchor="middle"
                className="fill-foreground text-[6px] font-medium pointer-events-none"
              >
                {name}
              </text>
            )}
          </g>
        );
      })}

      {/* View label */}
      <text
        x={70}
        y={344}
        textAnchor="middle"
        className="fill-muted-foreground text-[8px] font-medium"
      >
        {view === "front" ? "FRONT" : "BACK"}
      </text>
    </svg>
  );
}

export function BodyMap({
  activeMuscles,
  className,
  showLabels = true,
  size = "md",
}: BodyMapProps) {
  const { width, height } = SIZE_MAP[size];

  // Determine which views actually have active muscles
  const hasFront = activeMuscles.some((m) => MUSCLE_PATHS[m.trim()]?.front);
  const hasBack = activeMuscles.some((m) => MUSCLE_PATHS[m.trim()]?.back);

  return (
    <div className={cn("flex items-start justify-center gap-2", className)}>
      {(hasFront || !hasBack) && (
        <BodySvg
          view="front"
          activeMuscles={activeMuscles}
          width={width}
          height={height}
          showLabels={showLabels}
        />
      )}
      {hasBack && (
        <BodySvg
          view="back"
          activeMuscles={activeMuscles}
          width={width}
          height={height}
          showLabels={showLabels}
        />
      )}
    </div>
  );
}

/** Compact inline version showing just a pill with muscle count + mini body icon */
export function MuscleIndicator({ muscles }: { muscles: string[] }) {
  if (muscles.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <BodyMap activeMuscles={muscles} size="sm" showLabels={false} />
    </div>
  );
}
