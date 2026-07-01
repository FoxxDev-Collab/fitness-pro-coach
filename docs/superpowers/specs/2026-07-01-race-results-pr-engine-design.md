# Race Results & PR Engine — Phase 1 Design

**Date:** 2026-07-01
**Status:** Approved for implementation planning
**Scope:** Coach-facing race-results tracking for teams, tailored to cross-country first, built on a sport-agnostic core.

---

## 1. Goal & context

The app manages sports teams (`Team` → `Athlete`, `TeamEvent`, `TeamAnnouncement`, per-athlete `MetricEntry`). It has **no way to record competition results**. For a cross-country coach, results (times, places, PRs, team scoring) are the heart of the job.

This is **Phase 1 of a larger effort**. It delivers a coach-facing results engine as a standalone quick win. Its data model is deliberately built to feed later phases (parent/athlete portals, sharing/privacy controls, public rankings) without rework.

**Sport-agnostic core, XC-tailored first:** the engine understands "a mark, measured in a unit, where *better* is higher or lower." Cross-country configures that as "time over a distance, lower is better." Track, swimming, throws, and lifting slot in later purely by adding `Discipline` rows — no code changes.

### Why not extend the existing metrics system
`MetricDefinition` / `MetricEntry` track arbitrary float values over time. They have **no finish place, no better-is-lower direction, no splits, and no team scoring**, and store raw floats (a 19:42 time would be a meaningless number). Race results are a distinct domain; overloading metrics would corrupt both. Results get their own models.

---

## 2. Scope

### In scope (Phase 1)
- Sport-agnostic `Discipline` model; seeded with XC defaults (5K, 3200m, 2 Mile).
- Results recorded for **the coach's own runners only** (not the full multi-team field).
- Per result: time (or mark), overall finish place, squad (Varsity/JV/…), optional **splits** (first-class), DNF/DNS flag.
- Auto-computed **season PRs & bests**, PR badges, improvement deltas, per-runner **progression charts**.
- Auto **team scoring** for the coach's team: top-5 place sum + 6th/7th displacers, **pack time** (1st–5th scorer spread), spread, average — computed per squad × gender group.
- Optional **manual opponent score** per meet/group for a Win/Loss readout.
- A dedicated **"Results" tab** on the team; entry also launchable from a meet on the Schedule; roster detail panel gains a "Races" section.
- Meets are existing `TeamEvent`s (new `MEET` event type).
- **Season-scoped PRs** (a PR = best this team/season), with the model built so cross-season "career" identity can be added later with no migration pain.
- Pure engine in `lib/results/` with **unit tests** (introduces a minimal `vitest` setup — the repo currently has none).

### Explicitly deferred (Phase 2+)
- Parent/athlete **portals & auth** (new `PARENT` role, athlete logins on the existing `athleteProfile` scaffold, invite + linking).
- **Sharing/privacy controls** (default per-family private stats; coach can optionally publish team results/rankings team-only or public).
- **Messaging / message board.**
- **Full-field multi-team standings** (per-race heats + external finishers + school labels) and **Athletic.net / MileSplit import** — no integrations in Phase 1.
- **Career PRs** across seasons (cross-season runner identity).
- RSVP/attendance, volunteer & carpool signups, weekly mileage log, other-sport discipline UX polish.

---

## 3. Data model (Prisma additions)

```prisma
enum DisciplineUnit  { TIME  DISTANCE  WEIGHT  POINTS }
enum ResultDirection { LOWER_BETTER  HIGHER_BETTER }

// add MEET to the existing EventType enum:
//   enum EventType { PRACTICE GAME MEET MEETING TRYOUT CAMP FUNDRAISER OTHER }

model Discipline {
  id             String          @id @default(cuid())
  coachId        String
  name           String          // "5K", "3200m", "2 Mile"
  unitType       DisciplineUnit  // TIME for XC
  direction      ResultDirection // LOWER_BETTER for time
  distanceMeters Int?            // optional, for sorting/labeling
  archived       Boolean         @default(false)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  coach          User            @relation("CoachDisciplines", fields: [coachId], references: [id], onDelete: Cascade)
  results        RaceResult[]

  @@index([coachId])
}

model RaceResult {
  id           String   @id @default(cuid())
  eventId      String            // the meet (TeamEvent)
  athleteId    String
  disciplineId String
  value        Float             // canonical unit: seconds (TIME) / meters (DISTANCE) / kg (WEIGHT) / points (POINTS)
  place        Int?              // overall finish place in the race
  squad        String?           // "Varsity" | "JV" | ...
  dnf          Boolean  @default(false)   // did not finish / did not start
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  event        TeamEvent  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  athlete      Athlete    @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  discipline   Discipline @relation(fields: [disciplineId], references: [id], onDelete: Cascade)
  splits       Split[]

  @@unique([eventId, athleteId, disciplineId])   // one result per runner per discipline per meet
  @@index([eventId])
  @@index([athleteId])
  @@index([disciplineId])
}

model Split {
  id       String     @id @default(cuid())
  resultId String
  order    Int                // 1, 2, 3 ...
  label    String?            // "Mile 1"
  value    Float              // per-segment seconds
  result   RaceResult @relation(fields: [resultId], references: [id], onDelete: Cascade)

  @@index([resultId])
}

model MeetOpponentScore {
  id           String    @id @default(cuid())
  eventId      String
  groupLabel   String    // e.g. "Varsity Boys"
  opponentName String
  score        Int
  event        TeamEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
}
```

**Relations added to existing models:**
- `User`: `disciplines Discipline[] @relation("CoachDisciplines")`
- `TeamEvent`: `results RaceResult[]` and `opponentScores MeetOpponentScore[]`
- `Athlete`: `results RaceResult[]`

**Storage conventions:**
- `value` and split `value` are stored in the discipline's **canonical unit** — seconds for TIME. UI parses/formats; DB stays numeric for exact comparisons.
- Splits are **per-segment** times (6:15, 6:22, 6:28), not cumulative. UI may present cumulative.
- `place` is the runner's **overall finish place in the race**, read from the results sheet. Team score sums our top-5 places (see §4).

---

## 4. The engine (`lib/results/` — pure, unit-tested)

Pure functions, no DB access, so they are trivially testable and reusable in later phases.

### `format.ts`
- `parseTime(input: string): number` — accepts `"19:42"`, `"19:42.5"`, `"1:02:03"`, `"58.4"` → seconds. Throws on malformed input.
- `formatTime(seconds: number): string` — → `"19:42.5"` (drops leading zero units).
- `formatValue(value, unitType): string` — TIME → `formatTime`; DISTANCE → `"12.40 m"`; WEIGHT → `"52.5 kg"`; POINTS → `"128"`.

### `records.ts`
- `bestOf(results, direction)` — min or max by `direction`.
- `computeSeasonBests(results)` — best `RaceResult` per `athleteId + disciplineId`.
- `isPersonalBest(result, priorResults)` — is this the athlete's best for the discipline (excluding DNF)?
- `improvementDelta(result, priorBest)` — signed delta vs the runner's best *before* this meet (for "−0:14 PR" badges).

### `scoring.ts`
Operates on one **group** = (squad, gender) within a meet, using the coach's finishers only.
- `computeTeamScore(groupResults)` →
  - `scorers`: top-5 finishers by `place` (exclude DNF).
  - `score`: sum of the 5 scorers' `place` values.
  - `displacers`: 6th & 7th finishers.
  - `packTimeSeconds`: 5th scorer time − 1st scorer time.
  - `spreadSeconds`, `averageSeconds` of scorers.
  - `complete`: false if fewer than 5 finishers (no official score; show "incomplete").
- Win/Loss: compare computed `score` against any `MeetOpponentScore` rows for the group (lower wins; note XC tiebreak = 6th runner, documented but not auto-resolved in v1).

**Documented limitation:** with only our runners entered, `score` is the sum of our top-5 *overall* places — directly comparable to a manually entered opponent score, but not a full auto multi-team standing (deferred).

---

## 5. Server actions (`lib/actions/results.ts`)

All coach-scoped, mirroring the auth pattern in `lib/actions/team-events.ts` (`validateId` + `getCoachId` + ownership check).

- `ensureDefaultDisciplines(coachId)` — seeds XC defaults (5K, 3200m, 2 Mile) if the coach has none.
- `getDisciplines()`, `createDiscipline(input)`, `updateDiscipline(id, input)`, `archiveDiscipline(id)`.
- `getMeetResults(eventId)` — existing results + splits for a meet, plus the team roster for entry prefill.
- `saveMeetResults(eventId, rows[])` — upsert per `(eventId, athleteId, disciplineId)`; replace that result's splits; skip blank rows (no mark and not DNF); set `dnf` explicitly.
- `deleteResult(id)`.
- `setMeetOpponentScores(eventId, entries[])`.
- `getTeamResultsOverview(teamId)` — season PR/record board, meets list with computed scores, and chart series.
- `getAthleteRaces(athleteId)` — that runner's results, PRs, and progression series.

Reads run the engine functions from §4 over queried rows; nothing computed is persisted.

---

## 6. Validation (`lib/validations/results.ts`)

Zod schemas: `disciplineSchema`, `resultRowSchema` (athleteId, disciplineId, value ≥ 0 or `dnf`, optional place ≥ 1, squad, splits[]), `splitSchema`, `opponentScoreSchema`. Time strings are parsed to seconds **client-side** before submit; the server validates numerics.

---

## 7. UI / components

To avoid bloating the already-large `team-tabs.tsx` (~2,900 lines), results UI lives in **new files** and is imported into the tab shell.

- **`app/(coach)/teams/[id]/results-tab.tsx`** — `ResultsTab`: season **PR/record board** (best per runner per discipline, with badges), **meets list** with computed team scores + W/L, and **progression charts**.
- **`app/(coach)/teams/[id]/meet-results-entry.tsx`** — `MeetResultsDialog`/screen: roster prefilled; per runner → `TimeInput` (or number for non-TIME), place, squad `Select`, DNF toggle, expandable **splits** editor. One screen, keyboard-friendly.
- **`components/results/time-input.tsx`** — reusable masked input accepting `mm:ss(.t)` / `h:mm:ss`, emitting seconds; plain number input for DISTANCE/WEIGHT/POINTS.
- **`components/results/discipline-manager.tsx`** — small dialog to add/edit/archive disciplines (seeded with XC defaults).
- **`components/charts/result-trend-chart.tsx`** — progression chart (reuses the existing chart stack in `components/charts/`).
- **`team-tabs.tsx`** — add the `Results` `TabsTrigger` + `TabsContent` (8th tab; the shipped tab-wrap fix handles mobile). Add a **"Races"** section to the roster detail panel (`AthleteDetailPanel`).
- **`app/(coach)/teams/[id]/page.tsx`** — fetch disciplines + `getTeamResultsOverview` and pass to `TeamTabs` → `ResultsTab`.
- Schedule tab: meet-type events get an **"Enter/View Results"** action that opens the entry screen.

---

## 8. Data flow

1. Coach schedules a meet (`TeamEvent`, type `MEET`) on the Schedule tab.
2. After the meet: **Enter Results** → roster prefilled → type time + place + squad (+ optional splits) per runner → `saveMeetResults` upserts `RaceResult` + `Split` rows, `revalidatePath` the team.
3. On read, the engine (§4) computes PRs, season bests, deltas, and team scores from the stored rows.
4. **Results tab** shows the PR board, meets with scores/W-L, and charts; the **roster panel** shows each runner's races + trend.

---

## 9. Error handling

- **Time parsing:** invalid strings surface an inline field error and block submit (client-side).
- **Auth:** coach ownership checks throw `"Not authorized"` (mirrors existing team actions).
- **Blank rows:** skipped on save (a runner with no mark and no DNF is simply not recorded).
- **DNF/DNS:** stored explicitly; excluded from PRs, bests, and scoring.
- **Uniqueness:** the `(eventId, athleteId, disciplineId)` unique key makes saves idempotent via upsert.
- **Incomplete team (<5 finishers):** scoring returns `complete: false`; UI shows "incomplete," not a misleading number.

---

## 10. Testing

The repo has no test runner today. Introduce a **minimal `vitest` setup** scoped to the pure engine (the highest-risk logic):
- `lib/results/format.test.ts` — `parseTime`/`formatTime` round-trips, edge cases (`58.4`, `1:02:03`, malformed).
- `lib/results/records.test.ts` — season best selection by direction, PR detection, improvement deltas.
- `lib/results/scoring.test.ts` — top-5 sum, displacers, pack time/spread/average, `<5` incomplete case, W/L vs opponent score.

Add a `"test": "vitest run"` script. No component/E2E tests in Phase 1.

---

## 11. Build sequence (for the implementation plan)

1. Schema additions + migration; add `MEET` to `EventType`.
2. `lib/results/` engine + unit tests (vitest setup).
3. `lib/validations/results.ts`.
4. `lib/actions/results.ts` (+ default-discipline seeding).
5. `TimeInput` + discipline manager.
6. Meet results entry screen.
7. Results tab (board + meets + charts) and wire into `page.tsx` / `team-tabs.tsx`.
8. Roster "Races" section + schedule "Enter Results" hook.
9. Manual verification pass on a phone viewport (per mobile guidelines).

---

## 12. Decisions on record

| Decision | Choice |
|---|---|
| Core abstraction | Sport-agnostic `Discipline` (unitType + direction); XC seeded first |
| Meet representation | Reuse `TeamEvent` (new `MEET` type), not a separate model |
| Metrics reuse | No — dedicated result models |
| Field of entry | **Our team's runners only** (not full multi-team field) |
| Team scoring | Auto for our team (top-5 + displacers, pack/spread/avg); optional manual opponent score for W/L |
| Splits | First-class, optional per runner |
| PR scope | Season-scoped now; model career-ready for later |
| Placement | Dedicated "Results" tab |
| Integrations | None in Phase 1 |
