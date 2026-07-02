# Plan — Unify Results into Metrics + Email notification hardening

Date: 2026-07-01. Status: approved (user chose "Unify into one system").

Two independent items shipped together.

---

## Item 1 — Unify race Results into the Metrics model

### Decision
`Discipline`/`RaceResult`/`Split(resultId)` are a parallel implementation of
`MetricDefinition`/`MetricEntry`. Collapse them: a **discipline is a
`MetricDefinition` with a `direction`**; a **race result is a `MetricEntry`
tied to a `TeamEvent`** carrying competition fields. `MeetOpponentScore` stays
(team-level meet scoring, orthogonal).

Guiding constraint: the results **engine** (`lib/results/*`) is decoupled via
`EngineResult`, and the UI talks only to **action functions + DTO shapes**. Keep
those stable → engine, tests, and UI barely change. Keep `MetricEntry.value`
**NOT NULL** (store `0` for DNF, flagged by `status`) → no null-propagation churn.

### Schema (prisma/schema.prisma)
- Rename enum `DisciplineUnit` → `MetricUnit` (values unchanged).
- New enum `ResultStatus { FINISHED DNF DNS DQ }`.
- `MetricDefinition`: add `unitType MetricUnit @default(POINTS)`, `direction ResultDirection?`, `distanceMeters Int?`.
- `MetricEntry`: add `place Int?`, `squad String?`, `status ResultStatus @default(FINISHED)`, `splits Split[]`, `@@unique([eventId, athleteId, metricDefinitionId])`.
- `Split`: `resultId` → `metricEntryId` (FK → `MetricEntry`, cascade).
- Remove models `Discipline`, `RaceResult`; remove relations `User.disciplines`, `Athlete.results`, `TeamEvent.results`.

A **"discipline" is now `MetricDefinition` where `direction IS NOT NULL`.**

### Data migration (hand-authored SQL migration, data-preserving)
Reuse existing PKs so the mapping is trivial (`Discipline.id`→`MetricDefinition.id`,
`RaceResult.id`→`MetricEntry.id`):
1. Rename enum, create `ResultStatus`, add columns.
2. `INSERT` disciplines → `MetricDefinition` (scope `ATHLETE`, copy unitType/direction/distanceMeters).
3. `INSERT` race results → `MetricEntry` (`date` = event.startTime, `status` from `dnf`).
4. Repoint `Split.metricEntryId = resultId`; drop `resultId`; add FK/index.
5. Add `MetricEntry` unique index; drop `RaceResult`, `Discipline`.

Preserves: 3 disciplines, 1 race result, 3 metric defs, 9 metric entries.

### Backend (keep exports + DTO shapes identical)
- `lib/actions/results.ts`: rewrite internals onto `metricDefinition`/`metricEntry`.
  `getDisciplines`/`getTeamResultsOverview` filter `direction: { not: null }`;
  results read/write `metricEntry` with `disciplineId` == `metricDefinitionId`,
  `dnf` == `status !== FINISHED`. Same function names, same return shapes.
- `lib/actions/metrics.ts`: `getAthleteMetricSummary` excludes disciplines
  (`direction: null`) so races don't show as mis-ranked "metrics".
  `getMetricDefinitions` keeps returning disciplines → race times now appear in
  the metric explorer/analytics (the unification payoff).

### Untouched (shapes stable)
`lib/results/{types,records,scoring,format}.ts` + their tests,
`meet-results-entry.tsx`, `results-tab.tsx`, `team-tabs.tsx`, `page.tsx`.

### Deferred (follow-up, communicated)
Race-time formatting inside the generic metric explorer (mm:ss), DNS/DQ entry UI,
dashboard race-performance block, splits-analysis charts, derived XC team scoring.

---

## Item 2 — Email notification hardening

Root cause of "10 identical emails": one send **per distinct recipient string**;
the test roster's plus-addresses all resolve to one inbox (working as designed).
Real gaps hardened:
- `lib/actions/team-events.ts` + `team-announcements.ts`: normalize
  `.trim().toLowerCase()` before the dedupe `Set` (collapses case/whitespace dupes,
  e.g. same address in `email` and `parentEmail`).
- `lib/email.ts`: thread an optional **idempotency key** into `resend.emails.send`
  (`event:{id}:{recipient}` / `announcement:{id}:{recipient}`) so an edit-resend or
  accidental resubmit is dropped server-side.
- Deferred: a persistent `EmailLog`/sent-log table (bigger; separate item).

---

## Verify → ship
`prisma generate` → apply migration (Neon, unpooled) → `next build` → `vitest run`
→ `eslint`. Commit (schema+migration, backend, email). Push → Vercel `migrate
deploy` no-ops (already applied) and serves new code.
