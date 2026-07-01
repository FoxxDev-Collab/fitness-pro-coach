# Race Results & PR Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a coach-facing cross-country race-results system: log runners' results per meet, auto-compute PRs/season bests + team scoring, and view progression — built on a sport-agnostic core.

**Architecture:** New Prisma models (`Discipline`, `RaceResult`, `Split`, `MeetOpponentScore`) with meets reusing `TeamEvent`. A pure, unit-tested engine in `lib/results/` computes formatting, PRs, deltas, and XC team scoring. Coach-scoped server actions in `lib/actions/results.ts` mirror the existing `team-events.ts` auth pattern. UI lives in new files (to avoid bloating `team-tabs.tsx`) surfaced as a new "Results" tab.

**Tech Stack:** Next.js 16 / React 19, Prisma 7 (+ `@prisma/adapter-pg`), zod 4, recharts 3, Tailwind v4, shadcn/radix UI. New dev dep: vitest.

Full design: `docs/superpowers/specs/2026-07-01-race-results-pr-engine-design.md`.

---

## File structure

**Engine (pure, tested):**
- `lib/results/format.ts` — time/value parsing & formatting
- `lib/results/records.ts` — PR / season-best / delta logic
- `lib/results/scoring.ts` — XC team scoring
- `lib/results/types.ts` — shared TS types for the engine
- `lib/results/*.test.ts` — unit tests

**Data / server:**
- `prisma/schema.prisma` — new models + `MEET` enum value (modify)
- `prisma/migrations/<ts>_add_race_results/migration.sql` — generated
- `lib/validations/results.ts` — zod schemas
- `lib/actions/results.ts` — coach-scoped actions

**UI:**
- `components/results/time-input.tsx` — masked time input
- `components/charts/result-trend-chart.tsx` — recharts progression chart with time formatting
- `app/(coach)/teams/[id]/results-tab.tsx` — Results tab (board + meets + charts)
- `app/(coach)/teams/[id]/meet-results-entry.tsx` — per-meet entry dialog + discipline manager
- `app/(coach)/teams/[id]/team-tabs.tsx` — add Results tab + roster "Races" section (modify)
- `app/(coach)/teams/[id]/page.tsx` — fetch + pass results data (modify)

---

## Task 1: Test setup + engine types & formatting (TDD)

**Files:**
- Create: `vitest.config.ts`, `lib/results/types.ts`, `lib/results/format.ts`, `lib/results/format.test.ts`
- Modify: `package.json` (add `vitest` devDep + `"test"` script)

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest@^2`
Then add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["lib/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 3: Create engine types** (`lib/results/types.ts`)

```ts
export type UnitType = "TIME" | "DISTANCE" | "WEIGHT" | "POINTS";
export type Direction = "LOWER_BETTER" | "HIGHER_BETTER";

// A minimal shape the engine needs — decoupled from Prisma rows.
export type EngineResult = {
  id: string;
  athleteId: string;
  disciplineId: string;
  eventId: string;
  value: number; // canonical unit (seconds for TIME)
  place: number | null;
  squad: string | null;
  gender: string | null; // from Athlete.gender, for scoring groups
  dnf: boolean;
  date: Date; // the meet date, for ordering
};
```

- [ ] **Step 4: Write failing tests** (`lib/results/format.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { parseTime, formatTime, formatValue } from "./format";

describe("parseTime", () => {
  it("parses mm:ss", () => expect(parseTime("19:42")).toBe(1182));
  it("parses mm:ss.t", () => expect(parseTime("19:42.5")).toBe(1182.5));
  it("parses h:mm:ss", () => expect(parseTime("1:02:03")).toBe(3723));
  it("parses bare seconds", () => expect(parseTime("58.4")).toBeCloseTo(58.4));
  it("throws on garbage", () => expect(() => parseTime("abc")).toThrow());
  it("throws on empty", () => expect(() => parseTime("")).toThrow());
});

describe("formatTime", () => {
  it("formats mm:ss", () => expect(formatTime(1182)).toBe("19:42"));
  it("formats tenths", () => expect(formatTime(1182.5)).toBe("19:42.5"));
  it("formats hours", () => expect(formatTime(3723)).toBe("1:02:03"));
  it("pads seconds", () => expect(formatTime(65)).toBe("1:05"));
});

describe("formatValue", () => {
  it("times", () => expect(formatValue(1182, "TIME")).toBe("19:42"));
  it("distance", () => expect(formatValue(12.4, "DISTANCE")).toBe("12.40 m"));
  it("weight", () => expect(formatValue(52.5, "WEIGHT")).toBe("52.5 kg"));
  it("points", () => expect(formatValue(128, "POINTS")).toBe("128"));
});
```

- [ ] **Step 5: Run to verify fail** — `npm run test -- format` → FAIL (module not found).

- [ ] **Step 6: Implement** (`lib/results/format.ts`)

```ts
import type { UnitType } from "./types";

/** Parse "19:42", "19:42.5", "1:02:03", or bare seconds "58.4" into seconds. */
export function parseTime(input: string): number {
  const s = input.trim();
  if (!s) throw new Error("Empty time");
  const parts = s.split(":");
  if (parts.length > 3) throw new Error(`Invalid time: ${input}`);
  let seconds = 0;
  for (const part of parts) {
    const n = Number(part);
    if (Number.isNaN(n)) throw new Error(`Invalid time: ${input}`);
    seconds = seconds * 60 + n;
  }
  return seconds;
}

/** Format seconds → "19:42", "19:42.5", or "1:02:03". */
export function formatTime(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  let s = Math.abs(seconds);
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const whole = Math.floor(s);
  const tenths = Math.round((s - whole) * 10);
  const secStr = String(whole).padStart(2, "0") + (tenths ? `.${tenths}` : "");
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, "0")}:${secStr}`;
  return `${sign}${m}:${secStr}`;
}

export function formatValue(value: number, unitType: UnitType): string {
  switch (unitType) {
    case "TIME": return formatTime(value);
    case "DISTANCE": return `${value.toFixed(2)} m`;
    case "WEIGHT": return `${value % 1 === 0 ? value : value.toFixed(1)} kg`;
    case "POINTS": return `${value}`;
  }
}
```

Note: `formatTime(65)` → minutes `1`, whole seconds `05` → `"1:05"` (top-level minutes are not zero-padded).

- [ ] **Step 7: Run to verify pass** — `npm run test -- format` → PASS.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts package.json package-lock.json lib/results/format.ts lib/results/format.test.ts lib/results/types.ts
git commit -m "feat(results): add engine time/value formatting with vitest setup"
```

---

## Task 2: Engine — PR / season best / delta (TDD)

**Files:** Create `lib/results/records.ts`, `lib/results/records.test.ts`

- [ ] **Step 1: Write failing tests** (`lib/results/records.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { bestOf, seasonBests, improvementDelta } from "./records";
import type { EngineResult } from "./types";

const r = (o: Partial<EngineResult>): EngineResult => ({
  id: "x", athleteId: "a", disciplineId: "5k", eventId: "e",
  value: 0, place: null, squad: null, gender: null, dnf: false, date: new Date("2026-09-01"), ...o,
});

describe("bestOf", () => {
  it("LOWER_BETTER picks min", () =>
    expect(bestOf([r({ value: 1200 }), r({ value: 1182 })], "LOWER_BETTER")!.value).toBe(1182));
  it("HIGHER_BETTER picks max", () =>
    expect(bestOf([r({ value: 10 }), r({ value: 12 })], "HIGHER_BETTER")!.value).toBe(12));
  it("ignores DNF", () =>
    expect(bestOf([r({ value: 1, dnf: true }), r({ value: 1182 })], "LOWER_BETTER")!.value).toBe(1182));
  it("empty → null", () => expect(bestOf([], "LOWER_BETTER")).toBeNull());
});

describe("seasonBests", () => {
  it("keys by athlete+discipline", () => {
    const map = seasonBests(
      [r({ athleteId: "a", value: 1200 }), r({ athleteId: "a", value: 1182 }),
       r({ athleteId: "b", value: 1300 })],
      "LOWER_BETTER",
    );
    expect(map.get("a|5k")!.value).toBe(1182);
    expect(map.get("b|5k")!.value).toBe(1300);
  });
});

describe("improvementDelta", () => {
  it("negative = faster than prior best (LOWER_BETTER)", () => {
    const current = r({ value: 1168, date: new Date("2026-09-15") });
    const prior = [r({ value: 1182, date: new Date("2026-09-01") })];
    expect(improvementDelta(current, prior, "LOWER_BETTER")).toBe(-14);
  });
  it("null when no prior", () =>
    expect(improvementDelta(r({ value: 1182 }), [], "LOWER_BETTER")).toBeNull());
});
```

- [ ] **Step 2: Run to verify fail** — `npm run test -- records` → FAIL.

- [ ] **Step 3: Implement** (`lib/results/records.ts`)

```ts
import type { EngineResult, Direction } from "./types";

export function bestOf(results: EngineResult[], dir: Direction): EngineResult | null {
  const valid = results.filter((r) => !r.dnf);
  if (valid.length === 0) return null;
  return valid.reduce((best, r) =>
    dir === "LOWER_BETTER"
      ? (r.value < best.value ? r : best)
      : (r.value > best.value ? r : best),
  );
}

const key = (r: EngineResult) => `${r.athleteId}|${r.disciplineId}`;

export function seasonBests(results: EngineResult[], dir: Direction): Map<string, EngineResult> {
  const groups = new Map<string, EngineResult[]>();
  for (const r of results) {
    const k = key(r);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  const out = new Map<string, EngineResult>();
  for (const [k, rs] of groups) {
    const best = bestOf(rs, dir);
    if (best) out.set(k, best);
  }
  return out;
}

/** Signed delta of `current` vs the best result strictly BEFORE it. null if no prior. */
export function improvementDelta(
  current: EngineResult,
  priorResults: EngineResult[],
  dir: Direction,
): number | null {
  const before = priorResults.filter(
    (r) => !r.dnf && r.date.getTime() < current.date.getTime(),
  );
  const prior = bestOf(before, dir);
  if (!prior) return null;
  return current.value - prior.value;
}
```

- [ ] **Step 4: Run to verify pass** — `npm run test -- records` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/results/records.ts lib/results/records.test.ts
git commit -m "feat(results): add PR/season-best/delta engine"
```

---

## Task 3: Engine — XC team scoring (TDD)

**Files:** Create `lib/results/scoring.ts`, `lib/results/scoring.test.ts`

- [ ] **Step 1: Write failing tests** (`lib/results/scoring.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { computeTeamScore } from "./scoring";
import type { EngineResult } from "./types";

const f = (place: number, value: number, dnf = false): EngineResult => ({
  id: `r${place}`, athleteId: `a${place}`, disciplineId: "5k", eventId: "e",
  value, place, squad: "Varsity", gender: "M", dnf, date: new Date("2026-09-01"),
});

describe("computeTeamScore", () => {
  it("sums top-5 places, marks displacers, computes pack/spread/avg", () => {
    const s = computeTeamScore([
      f(3, 1180), f(5, 1190), f(8, 1200), f(12, 1210), f(14, 1220),
      f(18, 1240), f(21, 1260),
    ]);
    expect(s.complete).toBe(true);
    expect(s.score).toBe(3 + 5 + 8 + 12 + 14);
    expect(s.scorers.map((r) => r.place)).toEqual([3, 5, 8, 12, 14]);
    expect(s.displacers.map((r) => r.place)).toEqual([18, 21]);
    expect(s.packTimeSeconds).toBe(1220 - 1180);
    expect(s.averageSeconds).toBeCloseTo((1180 + 1190 + 1200 + 1210 + 1220) / 5);
  });
  it("fewer than 5 finishers → incomplete, no score", () => {
    const s = computeTeamScore([f(1, 1000), f(2, 1010)]);
    expect(s.complete).toBe(false);
    expect(s.score).toBeNull();
  });
  it("excludes DNF from scoring", () => {
    const s = computeTeamScore([
      f(1, 1000), f(2, 1010, true), f(3, 1020), f(4, 1030), f(5, 1040), f(6, 1050),
    ]);
    // DNF at place 2 removed → scorers are places 1,3,4,5,6
    expect(s.scorers.map((r) => r.place)).toEqual([1, 3, 4, 5, 6]);
    expect(s.score).toBe(1 + 3 + 4 + 5 + 6);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npm run test -- scoring` → FAIL.

- [ ] **Step 3: Implement** (`lib/results/scoring.ts`)

```ts
import type { EngineResult } from "./types";

export type TeamScore = {
  complete: boolean;
  score: number | null;
  scorers: EngineResult[];
  displacers: EngineResult[];
  finishers: number;
  packTimeSeconds: number | null;
  spreadSeconds: number | null;
  averageSeconds: number | null;
};

/**
 * XC scoring for ONE group (already filtered to a squad/gender).
 * Finishers ranked by finish `place`; top 5 score, 6th/7th displace.
 */
export function computeTeamScore(groupResults: EngineResult[]): TeamScore {
  const finishers = groupResults
    .filter((r) => !r.dnf && r.place != null)
    .sort((a, b) => (a.place! - b.place!));

  const scorers = finishers.slice(0, 5);
  const displacers = finishers.slice(5, 7);
  const complete = scorers.length === 5;

  if (!complete) {
    return {
      complete: false, score: null, scorers, displacers,
      finishers: finishers.length,
      packTimeSeconds: null, spreadSeconds: null, averageSeconds: null,
    };
  }

  const score = scorers.reduce((sum, r) => sum + r.place!, 0);
  const values = scorers.map((r) => r.value);
  const pack = values[values.length - 1] - values[0];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return {
    complete: true, score, scorers, displacers,
    finishers: finishers.length,
    packTimeSeconds: pack, spreadSeconds: pack, averageSeconds: avg,
  };
}
```

- [ ] **Step 4: Run to verify pass** — `npm run test -- scoring` → PASS. Then `npm run test` → all engine tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/results/scoring.ts lib/results/scoring.test.ts
git commit -m "feat(results): add XC team-scoring engine"
```

---

## Task 4: Schema + migration

**Files:** Modify `prisma/schema.prisma`; Create migration under `prisma/migrations/`.

- [ ] **Step 1: Add `MEET` to `EventType`** (schema ~line 385) — insert `MEET` after `GAME`.

- [ ] **Step 2: Add enums + models** (append near the metrics models). Use the exact model definitions from spec §3 (`Discipline`, `RaceResult`, `Split`, `MeetOpponentScore`, enums `DisciplineUnit`, `ResultDirection`).

- [ ] **Step 3: Add relations to existing models:**
- `User`: `disciplines Discipline[] @relation("CoachDisciplines")`
- `TeamEvent`: `results RaceResult[]` and `opponentScores MeetOpponentScore[]`
- `Athlete`: `results RaceResult[]`

- [ ] **Step 4: Generate the migration.** Preferred (needs dev DB): `npx prisma migrate dev --name add_race_results`. If no DB reachable, generate SQL without a DB:

```bash
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > _mig.sql
```

Then create `prisma/migrations/<UTC-timestamp>_add_race_results/migration.sql` with that SQL and delete `_mig.sql`. Timestamp format: `YYYYMMDDHHMMSS`.

- [ ] **Step 5: Regenerate client + verify types** — `npx prisma generate` then `npx tsc --noEmit` (expected clean; new models available on `db`).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(results): add Discipline/RaceResult/Split/MeetOpponentScore schema + migration"
```

---

## Task 5: Validation schemas

**Files:** Create `lib/validations/results.ts`

- [ ] **Step 1: Implement** — zod schemas mirroring `lib/validations/team-events.ts` style:

```ts
import { z } from "zod";

export const disciplineUnitSchema = z.enum(["TIME", "DISTANCE", "WEIGHT", "POINTS"]);
export const resultDirectionSchema = z.enum(["LOWER_BETTER", "HIGHER_BETTER"]);

export const disciplineSchema = z.object({
  name: z.string().trim().min(1).max(60),
  unitType: disciplineUnitSchema,
  direction: resultDirectionSchema,
  distanceMeters: z.number().int().positive().optional(),
});

export const splitSchema = z.object({
  order: z.number().int().min(1),
  label: z.string().trim().max(40).optional(),
  value: z.number().positive(),
});

export const resultRowSchema = z
  .object({
    athleteId: z.string().min(1),
    disciplineId: z.string().min(1),
    value: z.number().positive().optional(),
    place: z.number().int().positive().optional(),
    squad: z.string().trim().max(40).optional(),
    dnf: z.boolean().default(false),
    notes: z.string().trim().max(500).optional(),
    splits: z.array(splitSchema).max(20).optional(),
  })
  .refine((r) => r.dnf || r.value != null, {
    message: "A time/mark is required unless the runner is marked DNF",
    path: ["value"],
  });

export const saveMeetResultsSchema = z.object({
  rows: z.array(resultRowSchema).max(200),
});

export const opponentScoreSchema = z.object({
  groupLabel: z.string().trim().min(1).max(60),
  opponentName: z.string().trim().min(1).max(120),
  score: z.number().int().min(0),
});

export type DisciplineInput = z.infer<typeof disciplineSchema>;
export type ResultRowInput = z.infer<typeof resultRowSchema>;
export type OpponentScoreInput = z.infer<typeof opponentScoreSchema>;
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit** — `git add lib/validations/results.ts && git commit -m "feat(results): add validation schemas"`

---

## Task 6: Server actions

**Files:** Create `lib/actions/results.ts`

Mirror `lib/actions/team-events.ts`: `"use server"`, `validateId`, `getCoachId`, ownership checks, `revalidatePath`.

- [ ] **Step 1: Implement** the following exported async functions:
- `ensureDefaultDisciplines()` — if coach has zero disciplines, create XC defaults: `{name:"5K",distanceMeters:5000}`, `{name:"3200m",distanceMeters:3200}`, `{name:"2 Mile",distanceMeters:3218}`, each `unitType:"TIME", direction:"LOWER_BETTER"`.
- `getDisciplines()` — coach's non-archived disciplines.
- `createDiscipline(input)`, `updateDiscipline(id, input)`, `archiveDiscipline(id)` — coach-scoped.
- `getMeetResults(eventId)` — verify event's team belongs to coach; return `{ event, roster: athletes, results: RaceResult[] with splits }`.
- `saveMeetResults(eventId, input)` — parse `saveMeetResultsSchema`; verify ownership; for each row upsert on `(eventId, athleteId, disciplineId)`; replace splits (deleteMany + create); skip rows where `!dnf && value == null`; `revalidatePath("/teams/"+teamId)`.
- `setMeetOpponentScores(eventId, entries)` — replace opponent scores for the event.
- `getTeamResultsOverview(teamId)` — verify ownership; fetch all `RaceResult`s for the team's events (join event for date/title) + disciplines; return raw rows mapped to `EngineResult` plus discipline metadata and meets list. Engine computation happens in the component/read layer or here — return enough for the UI to render board/charts.
- `getAthleteRaces(athleteId)` — that athlete's results with event + discipline, ordered by date.

Auth pattern reference (`team-events.ts:72-89`): load with `include: { team: { select: { coachId, id }}}`, compare to `getCoachId()`, throw `"Not authorized"`.

Note on mapping to engine: build `EngineResult` via `{ id, athleteId, disciplineId, eventId, value, place, squad, dnf, date: event.startTime }`.

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean, `npm run lint` clean.

- [ ] **Step 3: Commit** — `git add lib/actions/results.ts && git commit -m "feat(results): add coach-scoped result server actions"`

---

## Task 7: TimeInput component

**Files:** Create `components/results/time-input.tsx`

- [ ] **Step 1: Implement** a controlled input that stores seconds but displays a time string. Props: `{ value: number | null; onChange: (seconds: number | null) => void; disabled?: boolean; placeholder?: string }`. On blur, `parseTime` the text → seconds → `onChange`; if parse throws, show a red ring and keep raw text. Reuse `parseTime`/`formatTime` from `lib/results/format`. Base it on `components/ui/input.tsx`.

```tsx
"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { parseTime, formatTime } from "@/lib/results/format";

export function TimeInput({ value, onChange, disabled, placeholder = "mm:ss.t" }:{
  value: number | null; onChange: (s: number | null) => void; disabled?: boolean; placeholder?: string;
}) {
  const [text, setText] = useState(value == null ? "" : formatTime(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(value == null ? "" : formatTime(value)); }, [value]);
  const commit = () => {
    if (!text.trim()) { setInvalid(false); onChange(null); return; }
    try { onChange(parseTime(text)); setInvalid(false); }
    catch { setInvalid(true); }
  };
  return (
    <Input value={text} disabled={disabled} placeholder={placeholder} inputMode="decimal"
      onChange={(e) => setText(e.target.value)} onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className={cn(invalid && "ring-2 ring-destructive")} />
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** — `git add components/results/time-input.tsx && git commit -m "feat(results): add TimeInput component"`

---

## Task 8: Result trend chart

**Files:** Create `components/charts/result-trend-chart.tsx`

- [ ] **Step 1: Implement** a recharts line chart like `MetricChart` but with a Y-axis/tooltip formatter for TIME (uses `formatTime`). Props: `{ title: string; unitType: UnitType; data: { date: string; value: number }[]; direction: Direction }`. For LOWER_BETTER, reverse the Y axis (`reversed`) so "up = faster/better". Reuse the Card wrapper + tooltip style from `MetricChart`. Guard `data.length < 2` with the same empty state.

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean.
- [ ] **Step 3: Commit** — `git add components/charts/result-trend-chart.tsx && git commit -m "feat(results): add result trend chart"`

---

## Task 9: Meet results entry + discipline manager

**Files:** Create `app/(coach)/teams/[id]/meet-results-entry.tsx`

- [ ] **Step 1: Implement** two client components:
- `MeetResultsDialog({ eventId, teamId, roster, disciplines, existing, children })` — a Dialog. Discipline `Select` at top (defaults to first). A row per roster athlete: `TimeInput` (or number Input for non-TIME disciplines), place Input (number), squad `Select` (Varsity/JV/Other), DNF `Checkbox`, and an expandable splits editor (add/remove split rows, each a `TimeInput` + optional label). Prefill from `existing` results. On save, build `rows[]` and call `saveMeetResults`, then `router.refresh()` and close. Skip empty rows client-side.
- `DisciplineManagerDialog({ disciplines, children })` — list + add form (name, unit `Select`, direction `Select`, optional distance) calling `createDiscipline`/`archiveDiscipline`.

Follow the dialog/state patterns already in `team-tabs.tsx` (`EventFormDialog`, `MetricsTab`). Import server actions from `@/lib/actions/results`.

- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean, `npm run lint` clean.
- [ ] **Step 3: Commit** — `git add app/(coach)/teams/[id]/meet-results-entry.tsx && git commit -m "feat(results): add meet results entry + discipline manager"`

---

## Task 10: Results tab + wiring

**Files:** Create `app/(coach)/teams/[id]/results-tab.tsx`; Modify `team-tabs.tsx`, `page.tsx`.

- [ ] **Step 1: Implement `ResultsTab`** (`results-tab.tsx`), a client component receiving `{ teamId, meets, disciplines, results, roster }` (results already mapped to `EngineResult` + discipline metadata + event titles/dates). Render:
  - Header with **"Enter Results"** (opens `MeetResultsDialog` for a chosen/most-recent meet) and **"Disciplines"** (opens `DisciplineManagerDialog`).
  - **PR/record board:** for each discipline, list athletes with their season best (via `seasonBests`), formatted with `formatValue`, PR badges.
  - **Meets list:** each meet with computed `computeTeamScore` per squad×gender group (group by `squad` + athlete gender — pass gender in the mapped result), showing score/pack/spread/avg + any opponent W/L.
  - **Charts:** per athlete or per discipline `ResultTrendChart`.

- [ ] **Step 2: Wire `page.tsx`** — call `ensureDefaultDisciplines()`, `getDisciplines()`, `getTeamResultsOverview(id)`; pass into `TeamTabs`.

- [ ] **Step 3: Wire `team-tabs.tsx`** — add `Results` `TabsTrigger` (icon e.g. `Timer`/`Trophy`) + `TabsContent` rendering `ResultsTab`; extend the `Team`/props types; add a **"Races"** section to `AthleteDetailPanel` (that athlete's results via passed data + a `ResultTrendChart`). Add an "Enter Results" affordance on `MEET`/`GAME` events in `ScheduleTab`.

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean, `npm run lint` clean.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(results): add Results tab, athlete races, schedule hook, page wiring"`

---

## Task 11: Full verification

- [ ] **Step 1:** `npm run test` → all engine tests PASS.
- [ ] **Step 2:** `npm run lint` → no new errors.
- [ ] **Step 3:** `npx tsc --noEmit` → clean.
- [ ] **Step 4:** `npx next build` if a dev DB/DATABASE_URL is available (build runs `prisma migrate deploy`). If not reachable locally, rely on Vercel's build; ensure the migration SQL is valid by review.
- [ ] **Step 5:** Manual smoke (if dev server runs): create a MEET event, enter 5+ results, confirm PR badges, team score, and chart render; check mobile width.

---

## Task 12: Deploy

- [ ] **Step 1:** Ensure everything committed on `master`.
- [ ] **Step 2:** `git push origin master` (triggers Vercel build → `prisma migrate deploy` applies the migration → deploy).
- [ ] **Step 3:** Watch the Vercel build; verify the migration applied and the app boots.

---

## Notes / risks
- **Migration on prod:** Vercel `build` runs `prisma migrate deploy`. The generated `migration.sql` must be additive (all new tables/enum value) — no data backfill needed. Adding an enum value + new tables is safe/non-breaking.
- **Gender grouping:** `Athlete.gender` is free-text; scoring groups by `squad` + gender string as-is. Inconsistent values just create separate groups — acceptable for v1 (spec notes a possible future enum).
- **No DB in engine tests:** engine is pure; tests need no database.
