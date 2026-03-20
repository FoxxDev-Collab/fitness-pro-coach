"use client";

import { cn } from "@/lib/utils";

type Gender = "male" | "female";

type BodyMapProps = {
  activeMuscles: string[];
  gender?: Gender;
  className?: string;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
};

const SIZE_MAP = {
  sm: { width: 100, height: 240 },
  md: { width: 140, height: 336 },
  lg: { width: 180, height: 432 },
};

// ── Male body outlines ──────────────────────────────────────────
// Proportions: broader shoulders, narrower hips, muscular build
// ViewBox: 0 0 200 480

const MALE_FRONT =
  // Head
  "M 100,10 Q 85,10 80,22 Q 76,32 76,42 Q 76,56 84,64 Q 88,68 88,72 " +
  // Neck
  "L 88,78 Q 86,80 84,82 " +
  // Left shoulder
  "Q 72,82 62,86 Q 50,90 44,98 " +
  // Left arm
  "Q 38,106 36,116 Q 34,126 32,136 Q 30,146 30,156 Q 30,162 32,168 Q 34,174 36,178 Q 38,184 38,190 " +
  // Left hand
  "Q 38,196 36,200 Q 34,206 36,208 Q 38,210 40,208 Q 42,204 44,198 Q 46,192 46,186 " +
  // Left torso
  "Q 48,176 50,164 Q 52,152 54,142 Q 56,132 58,120 Q 60,112 62,106 " +
  // Waist left
  "Q 64,118 66,132 Q 68,146 68,160 " +
  // Left hip
  "Q 66,168 64,176 Q 62,184 60,192 " +
  // Left leg
  "Q 58,204 56,218 Q 54,234 54,250 Q 54,268 56,284 Q 58,300 58,316 " +
  // Left shin
  "Q 58,332 56,348 Q 54,364 54,380 " +
  // Left ankle/foot
  "Q 54,396 52,410 Q 50,420 48,430 Q 46,440 48,446 Q 50,450 56,452 Q 62,454 66,452 Q 70,450 70,444 Q 70,438 68,430 Q 66,420 66,410 Q 66,396 68,380 " +
  // Inner left leg
  "Q 70,364 72,348 Q 74,332 76,316 Q 78,300 80,284 Q 82,268 84,252 Q 86,236 88,220 Q 90,204 92,192 " +
  // Crotch
  "Q 94,184 96,180 L 100,178 L 104,180 Q 106,184 108,192 " +
  // Right inner leg
  "Q 110,204 112,220 Q 114,236 116,252 Q 118,268 120,284 Q 122,300 124,316 Q 126,332 128,348 Q 130,364 132,380 " +
  // Right ankle/foot
  "Q 134,396 134,410 Q 134,420 132,430 Q 130,438 130,444 Q 130,450 134,452 Q 138,454 144,452 Q 150,450 152,446 Q 154,440 152,430 Q 150,420 148,410 Q 146,396 146,380 " +
  // Right shin
  "Q 146,364 144,348 Q 142,332 142,316 " +
  // Right leg
  "Q 142,300 144,284 Q 146,268 146,250 Q 146,234 144,218 Q 142,204 140,192 " +
  // Right hip
  "Q 138,184 136,176 Q 134,168 132,160 " +
  // Waist right
  "Q 132,146 134,132 Q 136,118 138,106 " +
  // Right torso
  "Q 140,112 142,120 Q 144,132 146,142 Q 148,152 150,164 Q 152,176 154,186 " +
  // Right hand
  "Q 154,192 156,198 Q 158,204 160,208 Q 162,210 164,208 Q 166,206 164,200 Q 162,196 162,190 " +
  // Right arm
  "Q 162,184 164,178 Q 166,174 168,168 Q 170,162 170,156 Q 170,146 168,136 Q 166,126 164,116 Q 162,106 156,98 " +
  // Right shoulder
  "Q 150,90 138,86 Q 128,82 116,82 " +
  // Neck right
  "Q 114,80 112,78 L 112,72 " +
  // Head right
  "Q 112,68 116,64 Q 124,56 124,42 Q 124,32 120,22 Q 115,10 100,10 Z";

const MALE_BACK =
  // Head (from behind, simpler - no face)
  "M 100,10 Q 85,10 80,22 Q 76,32 76,42 Q 76,56 84,64 Q 88,68 88,72 " +
  "L 88,78 Q 86,80 84,82 " +
  // Shoulders/torso/arms same structure
  "Q 72,82 62,86 Q 50,90 44,98 " +
  "Q 38,106 36,116 Q 34,126 32,136 Q 30,146 30,156 Q 30,162 32,168 Q 34,174 36,178 Q 38,184 38,190 " +
  "Q 38,196 36,200 Q 34,206 36,208 Q 38,210 40,208 Q 42,204 44,198 Q 46,192 46,186 " +
  "Q 48,176 50,164 Q 52,152 54,142 Q 56,132 58,120 Q 60,112 62,106 " +
  "Q 64,118 66,132 Q 68,146 68,160 " +
  "Q 66,168 64,176 Q 62,184 60,192 " +
  "Q 58,204 56,218 Q 54,234 54,250 Q 54,268 56,284 Q 58,300 58,316 " +
  "Q 58,332 56,348 Q 54,364 54,380 " +
  "Q 54,396 52,410 Q 50,420 48,430 Q 46,440 48,446 Q 50,450 56,452 Q 62,454 66,452 Q 70,450 70,444 Q 70,438 68,430 Q 66,420 66,410 Q 66,396 68,380 " +
  "Q 70,364 72,348 Q 74,332 76,316 Q 78,300 80,284 Q 82,268 84,252 Q 86,236 88,220 Q 90,204 92,192 " +
  "Q 94,184 96,180 L 100,178 L 104,180 Q 106,184 108,192 " +
  "Q 110,204 112,220 Q 114,236 116,252 Q 118,268 120,284 Q 122,300 124,316 Q 126,332 128,348 Q 130,364 132,380 " +
  "Q 134,396 134,410 Q 134,420 132,430 Q 130,438 130,444 Q 130,450 134,452 Q 138,454 144,452 Q 150,450 152,446 Q 154,440 152,430 Q 150,420 148,410 Q 146,396 146,380 " +
  "Q 146,364 144,348 Q 142,332 142,316 " +
  "Q 142,300 144,284 Q 146,268 146,250 Q 146,234 144,218 Q 142,204 140,192 " +
  "Q 138,184 136,176 Q 134,168 132,160 " +
  "Q 132,146 134,132 Q 136,118 138,106 " +
  "Q 140,112 142,120 Q 144,132 146,142 Q 148,152 150,164 Q 152,176 154,186 " +
  "Q 154,192 156,198 Q 158,204 160,208 Q 162,210 164,208 Q 166,206 164,200 Q 162,196 162,190 " +
  "Q 162,184 164,178 Q 166,174 168,168 Q 170,162 170,156 Q 170,146 168,136 Q 166,126 164,116 Q 162,106 156,98 " +
  "Q 150,90 138,86 Q 128,82 116,82 " +
  "Q 114,80 112,78 L 112,72 " +
  "Q 112,68 116,64 Q 124,56 124,42 Q 124,32 120,22 Q 115,10 100,10 Z";

// ── Female body outlines ──────────────────────────────────────────
// Proportions: narrower shoulders, wider hips, softer curves

const FEMALE_FRONT =
  // Head
  "M 100,8 Q 86,8 82,20 Q 78,30 78,40 Q 78,54 86,62 Q 88,66 88,70 " +
  // Neck (thinner)
  "L 90,76 Q 88,78 86,80 " +
  // Left shoulder (narrower)
  "Q 76,80 68,84 Q 56,88 50,96 " +
  // Left arm (slimmer)
  "Q 46,104 44,112 Q 42,122 40,132 Q 38,142 38,152 Q 38,158 40,164 Q 42,170 44,176 Q 46,182 46,188 " +
  // Left hand
  "Q 46,194 44,198 Q 42,204 44,206 Q 46,208 48,206 Q 50,202 52,196 Q 54,190 54,184 " +
  // Left torso - with waist curve
  "Q 56,174 58,162 Q 60,150 60,140 Q 60,128 62,118 Q 64,110 66,104 " +
  // Waist curves inward
  "Q 68,114 70,126 Q 72,138 72,148 " +
  // Left hip widens
  "Q 70,156 66,166 Q 62,176 58,188 " +
  // Left leg
  "Q 56,200 54,214 Q 52,230 52,248 Q 52,266 54,282 Q 56,298 56,314 " +
  // Left shin
  "Q 56,330 54,346 Q 52,362 52,378 " +
  // Left ankle/foot
  "Q 52,394 50,408 Q 48,418 46,428 Q 44,438 46,444 Q 48,448 54,450 Q 60,452 64,450 Q 68,448 68,442 Q 68,436 66,428 Q 64,418 64,408 Q 64,394 66,378 " +
  // Inner left leg
  "Q 68,362 70,346 Q 72,330 74,314 Q 76,298 78,282 Q 80,266 82,250 Q 84,234 86,218 Q 88,202 90,190 " +
  // Crotch
  "Q 92,182 96,178 L 100,176 L 104,178 Q 108,182 110,190 " +
  // Right inner leg
  "Q 112,202 114,218 Q 116,234 118,250 Q 120,266 122,282 Q 124,298 126,314 Q 128,330 130,346 Q 132,362 134,378 " +
  // Right ankle/foot
  "Q 136,394 136,408 Q 136,418 134,428 Q 132,436 132,442 Q 132,448 136,450 Q 140,452 146,450 Q 152,448 154,444 Q 156,438 154,428 Q 152,418 150,408 Q 148,394 148,378 " +
  // Right shin
  "Q 148,362 146,346 Q 144,330 144,314 " +
  // Right leg
  "Q 144,298 146,282 Q 148,266 148,248 Q 148,230 146,214 Q 144,200 142,188 " +
  // Right hip widens
  "Q 138,176 134,166 Q 130,156 128,148 " +
  // Waist right
  "Q 128,138 130,126 Q 132,114 134,104 " +
  // Right torso
  "Q 136,110 138,118 Q 140,128 140,140 Q 140,150 142,162 Q 144,174 146,184 " +
  // Right hand
  "Q 146,190 148,196 Q 150,202 152,206 Q 154,208 156,206 Q 158,204 156,198 Q 154,194 154,188 " +
  // Right arm
  "Q 154,182 156,176 Q 158,170 160,164 Q 162,158 162,152 Q 162,142 160,132 Q 158,122 156,112 Q 154,104 150,96 " +
  // Right shoulder
  "Q 144,88 132,84 Q 124,80 114,80 " +
  // Neck right
  "Q 112,78 110,76 L 112,70 " +
  // Head right
  "Q 112,66 114,62 Q 122,54 122,40 Q 122,30 118,20 Q 114,8 100,8 Z";

const FEMALE_BACK = FEMALE_FRONT; // Same silhouette from behind

// ── Muscle region paths (shared, slightly adjusted per gender) ──

const MUSCLE_REGIONS: Record<
  string,
  {
    front?: string[];
    back?: string[];
    label: { x: number; y: number; view: "front" | "back" };
  }
> = {
  Chest: {
    front: [
      // Left pec
      "M 80,100 Q 74,96 68,96 Q 62,98 60,104 Q 58,110 62,116 Q 68,120 76,118 Q 80,114 80,106 Z",
      // Right pec
      "M 120,100 Q 126,96 132,96 Q 138,98 140,104 Q 142,110 138,116 Q 132,120 124,118 Q 120,114 120,106 Z",
    ],
    label: { x: 100, y: 108, view: "front" },
  },
  Back: {
    back: [
      // Left lat
      "M 66,96 Q 60,104 58,118 Q 56,130 60,142 Q 66,148 74,142 Q 78,132 78,120 Q 78,106 74,98 Z",
      // Right lat
      "M 134,96 Q 140,104 142,118 Q 144,130 140,142 Q 134,148 126,142 Q 122,132 122,120 Q 122,106 126,98 Z",
      // Mid back
      "M 88,94 L 112,94 Q 114,110 114,126 Q 114,138 112,148 L 88,148 Q 86,138 86,126 Q 86,110 88,94 Z",
    ],
    label: { x: 100, y: 122, view: "back" },
  },
  Shoulders: {
    front: [
      "M 58,90 Q 48,88 44,96 Q 42,104 46,110 Q 50,114 56,110 Q 60,104 60,96 Z",
      "M 142,90 Q 152,88 156,96 Q 158,104 154,110 Q 150,114 144,110 Q 140,104 140,96 Z",
    ],
    back: [
      "M 58,90 Q 48,88 44,96 Q 42,104 46,110 Q 50,114 56,110 Q 60,104 60,96 Z",
      "M 142,90 Q 152,88 156,96 Q 158,104 154,110 Q 150,114 144,110 Q 140,104 140,96 Z",
    ],
    label: { x: 44, y: 100, view: "front" },
  },
  Biceps: {
    front: [
      "M 46,112 Q 42,120 40,132 Q 38,142 40,150 Q 44,154 48,150 Q 52,140 52,130 Q 52,120 50,112 Z",
      "M 154,112 Q 158,120 160,132 Q 162,142 160,150 Q 156,154 152,150 Q 148,140 148,130 Q 148,120 150,112 Z",
    ],
    label: { x: 42, y: 132, view: "front" },
  },
  Triceps: {
    back: [
      "M 48,112 Q 44,120 42,132 Q 40,142 42,152 Q 46,156 50,152 Q 54,142 54,132 Q 54,120 52,112 Z",
      "M 152,112 Q 156,120 158,132 Q 160,142 158,152 Q 154,156 150,152 Q 146,142 146,132 Q 146,120 148,112 Z",
    ],
    label: { x: 44, y: 132, view: "back" },
  },
  Core: {
    front: [
      "M 82,120 L 118,120 Q 120,136 120,152 Q 120,164 118,174 L 82,174 Q 80,164 80,152 Q 80,136 82,120 Z",
    ],
    label: { x: 100, y: 150, view: "front" },
  },
  Quads: {
    front: [
      "M 72,186 Q 68,200 64,218 Q 60,236 60,254 Q 60,270 64,282 Q 68,290 74,284 Q 80,272 82,256 Q 84,240 84,222 Q 84,204 80,190 Z",
      "M 128,186 Q 132,200 136,218 Q 140,236 140,254 Q 140,270 136,282 Q 132,290 126,284 Q 120,272 118,256 Q 116,240 116,222 Q 116,204 120,190 Z",
    ],
    label: { x: 72, y: 240, view: "front" },
  },
  Hamstrings: {
    back: [
      "M 72,188 Q 68,202 64,220 Q 60,238 60,256 Q 60,272 64,284 Q 68,292 74,286 Q 80,274 82,258 Q 84,242 84,224 Q 84,206 80,192 Z",
      "M 128,188 Q 132,202 136,220 Q 140,238 140,256 Q 140,272 136,284 Q 132,292 126,286 Q 120,274 118,258 Q 116,242 116,224 Q 116,206 120,192 Z",
    ],
    label: { x: 72, y: 242, view: "back" },
  },
  Glutes: {
    back: [
      "M 72,162 Q 64,168 60,178 Q 58,186 62,192 Q 68,196 78,194 Q 86,190 88,182 Q 88,174 84,168 Q 78,162 72,162 Z",
      "M 128,162 Q 136,168 140,178 Q 142,186 138,192 Q 132,196 122,194 Q 114,190 112,182 Q 112,174 116,168 Q 122,162 128,162 Z",
    ],
    label: { x: 100, y: 180, view: "back" },
  },
  Calves: {
    back: [
      "M 60,292 Q 58,304 58,318 Q 58,332 60,344 Q 64,356 68,350 Q 72,340 72,328 Q 72,316 70,304 Q 68,294 64,290 Z",
      "M 140,292 Q 142,304 142,318 Q 142,332 140,344 Q 136,356 132,350 Q 128,340 128,328 Q 128,316 130,304 Q 132,294 136,290 Z",
    ],
    label: { x: 64, y: 324, view: "back" },
  },
  "Full Body": {
    front: [
      "M 58,90 Q 44,96 42,112 Q 38,132 40,152 Q 44,160 54,156 Q 60,164 62,178 Q 60,200 58,224 Q 56,250 58,276 Q 60,300 60,324 Q 60,350 58,378 L 66,378 Q 68,350 70,324 Q 74,298 80,274 Q 84,250 88,224 Q 92,200 96,182 L 100,178 L 104,182 Q 108,200 112,224 Q 116,250 120,274 Q 126,298 130,324 Q 132,350 134,378 L 142,378 Q 140,350 140,324 Q 140,300 142,276 Q 144,250 142,224 Q 140,200 138,178 Q 140,164 146,156 Q 156,160 160,152 Q 162,132 158,112 Q 156,96 142,90 Q 130,84 116,82 L 112,78 L 112,72 Q 120,62 122,42 Q 122,22 100,10 Q 78,22 78,42 Q 80,62 88,72 L 88,78 L 84,82 Q 70,84 58,90 Z",
    ],
    label: { x: 100, y: 156, view: "front" },
  },
};

// ── Body outline detail paths (anatomical lines, not filled) ──

const MALE_DETAIL_FRONT = [
  // Pec lines
  "M 68,98 Q 76,96 80,100 Q 84,104 80,110",
  "M 132,98 Q 124,96 120,100 Q 116,104 120,110",
  // Ab lines
  "M 100,104 L 100,170",
  "M 88,118 L 112,118",
  "M 86,132 L 114,132",
  "M 86,146 L 114,146",
  "M 88,160 L 112,160",
  // Navel
  "M 98,152 Q 100,154 102,152",
  // Collarbone
  "M 84,84 Q 92,88 100,86 Q 108,88 116,84",
];

const MALE_DETAIL_BACK = [
  // Spine
  "M 100,84 L 100,170",
  // Shoulder blades
  "M 78,100 Q 84,108 90,104",
  "M 122,100 Q 116,108 110,104",
  // Lower back lines
  "M 86,140 Q 100,146 114,140",
  "M 88,156 Q 100,162 112,156",
];

const FEMALE_DETAIL_FRONT = [
  // Collarbone
  "M 86,82 Q 94,86 100,84 Q 106,86 114,82",
  // Navel
  "M 98,150 Q 100,152 102,150",
  // Waist lines
  "M 100,104 L 100,168",
];

const FEMALE_DETAIL_BACK = [
  // Spine
  "M 100,82 L 100,168",
  // Shoulder blade lines
  "M 80,98 Q 86,106 92,102",
  "M 120,98 Q 114,106 108,102",
  // Lower back
  "M 88,142 Q 100,148 112,142",
];

// ── Component ──────────────────────────────────────────

function BodySvg({
  view,
  gender,
  activeMuscles,
  width,
  height,
  showLabels,
}: {
  view: "front" | "back";
  gender: Gender;
  activeMuscles: string[];
  width: number;
  height: number;
  showLabels: boolean;
}) {
  const normalizedActive = activeMuscles.map((m) => m.trim());

  const outline =
    gender === "male"
      ? view === "front"
        ? MALE_FRONT
        : MALE_BACK
      : view === "front"
      ? FEMALE_FRONT
      : FEMALE_BACK;

  const detailLines =
    gender === "male"
      ? view === "front"
        ? MALE_DETAIL_FRONT
        : MALE_DETAIL_BACK
      : view === "front"
      ? FEMALE_DETAIL_FRONT
      : FEMALE_DETAIL_BACK;

  return (
    <svg
      viewBox="0 0 200 480"
      width={width}
      height={height}
      className="select-none"
    >
      {/* Body outline fill */}
      <path
        d={outline}
        className="fill-muted/30 stroke-border"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />

      {/* Anatomical detail lines */}
      {detailLines.map((d, i) => (
        <path
          key={`detail-${i}`}
          d={d}
          className="stroke-border/50"
          strokeWidth={0.8}
          fill="none"
        />
      ))}

      {/* Muscle groups */}
      {Object.entries(MUSCLE_REGIONS).map(([name, data]) => {
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
                    ? "fill-primary/50 stroke-primary"
                    : "fill-transparent stroke-transparent"
                )}
                strokeWidth={isActive ? 1.2 : 0}
              />
            ))}
            {showLabels && isActive && data.label.view === view && (
              <text
                x={data.label.x}
                y={data.label.y}
                textAnchor="middle"
                className="fill-foreground text-[8px] font-semibold pointer-events-none"
                style={{ textShadow: "0 0 3px hsl(var(--background))" }}
              >
                {name}
              </text>
            )}
          </g>
        );
      })}

      {/* View label */}
      <text
        x={100}
        y={474}
        textAnchor="middle"
        className="fill-muted-foreground text-[11px] font-medium tracking-wider"
      >
        {view === "front" ? "FRONT" : "BACK"}
      </text>
    </svg>
  );
}

export function BodyMap({
  activeMuscles,
  gender = "male",
  className,
  showLabels = true,
  size = "md",
}: BodyMapProps) {
  const { width, height } = SIZE_MAP[size];

  const hasFront = activeMuscles.some((m) => MUSCLE_REGIONS[m.trim()]?.front);
  const hasBack = activeMuscles.some((m) => MUSCLE_REGIONS[m.trim()]?.back);

  return (
    <div className={cn("flex items-start justify-center gap-2", className)}>
      {(hasFront || !hasBack) && (
        <BodySvg
          view="front"
          gender={gender}
          activeMuscles={activeMuscles}
          width={width}
          height={height}
          showLabels={showLabels}
        />
      )}
      {hasBack && (
        <BodySvg
          view="back"
          gender={gender}
          activeMuscles={activeMuscles}
          width={width}
          height={height}
          showLabels={showLabels}
        />
      )}
    </div>
  );
}

export function MuscleIndicator({ muscles, gender = "male" }: { muscles: string[]; gender?: Gender }) {
  if (muscles.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <BodyMap activeMuscles={muscles} gender={gender} size="sm" showLabels={false} />
    </div>
  );
}
