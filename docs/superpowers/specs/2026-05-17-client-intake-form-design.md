# Client Intake & Waiver Form — Design Spec

**Status:** Approved for implementation planning
**Date:** 2026-05-17
**Author:** Claude (Opus 4.7) with Jeremiah Price

## Summary

Add a required health/medical intake form with a coach-supplied liability waiver that every client must complete on first login before they can access the dashboard or workouts. Coaches configure their waiver text and add custom questions in Settings. The intake is locked once signed; coaches can request a re-take.

This replaces the now-defunct "public intake URL" concept that was implied by the welcome wizard but never implemented. The orphaned `User.intakeSlug` field is dropped from the UI in this PR and removed from the schema in a follow-up.

## Goals

1. Every active client has a signed waiver and self-reported health profile before training begins.
2. Coaches can configure their own waiver text and optional add-on questions.
3. The intake is auditable: signed name, IP, user agent, timestamp, and a snapshot of the waiver text are persisted with the response.
4. Coaches see the response read-only on the client detail page and can trigger a re-take when life circumstances change (new injury, pregnancy, new medication).

## Non-goals

- ❌ Public intake / lead capture at `/intake/<slug>` — different feature, different PR.
- ❌ Drawn-signature canvas — typed name only.
- ❌ Coach-customizable medical/health section — the medical section is fixed for everyone (safety); only add-on questions are customizable.
- ❌ Annual re-intake reminders / scheduled re-takes — coach manually requests for now.
- ❌ Multi-step / save-draft wizard for the client — single scrolling page with sections.
- ❌ Migrating data out of `Client.healthConditions` / `Client.gender` — those remain as coach-curated notes (what the coach observed); intake is a separate, client-attested source of truth.
- ❌ PDF export of signed waiver — useful for legal, but a follow-up.

## HIPAA / privacy posture

**HIPAA does not apply to Praevio.** The platform serves independent fitness coaches who do not bill insurance and do not operate in any medical capacity (confirmed with product owner 2026-05-17). The coach is not a HIPAA covered entity, and the client's self-reported information about medications, injuries, conditions, etc. is voluntary disclosure intended to inform training — it is not "protected health information" in the regulatory sense.

Implications for the design:
- No application-layer encryption of "medical" fields beyond what Postgres provides at rest via the host.
- No BAA / business associate workflow.
- No HIPAA-style audit logging beyond the existing `AuditLog` model usage.
- Access control follows the existing coach-owns-client scoping; no new role gates.
- The coach's waiver text (which the coach writes, not the platform) is the place to make clear that disclosure is voluntary and the coach is not providing medical advice.

The platform must not advertise HIPAA compliance — over-claiming is itself a legal risk.

## Data model

Three new tables, one new enum, two new fields on `User`. Existing `Client` columns are untouched.

```prisma
model User {
  // ...existing fields
  waiverText      String?              // required before inviting clients
  intakeQuestions IntakeQuestion[]     @relation("CoachIntakeQuestions")
  // intakeSlug stays in the column list this PR (UI references removed); dropped in follow-up migration.
}

enum IntakeQuestionType {
  SHORT_TEXT
  LONG_TEXT
  SINGLE_CHOICE
  MULTI_CHOICE
}

// Coach's reusable custom-question templates.
model IntakeQuestion {
  id        String              @id @default(cuid())
  coachId   String
  coach     User                @relation("CoachIntakeQuestions", fields: [coachId], references: [id], onDelete: Cascade)
  text      String
  type      IntakeQuestionType
  options   String[]            // empty for text types
  required  Boolean             @default(false)
  position  Int                 @default(0)
  archived  Boolean             @default(false)  // soft-delete; historical answers still resolve via FK
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt
  answers   IntakeAnswer[]

  @@index([coachId])
}

// One row per client. Lifecycle: missing → submitted (locked) → deleted on re-take → submitted again.
model IntakeResponse {
  id                    String   @id @default(cuid())
  clientId              String   @unique
  client                Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  // Fixed personal section
  dateOfBirth           DateTime?
  sex                   String?
  heightInches          Int?
  weightLbs             Float?
  occupation            String?

  // Fixed medical section
  medicalConditions     String[]
  conditionsOther       String?
  medications           String?      // free text; nullable when client says "none"
  pregnancyStatus       String?      // "No" | "Currently pregnant" | "Postpartum <12mo" | "N/A"
  physicianRestrictions String?      // free text; nullable when none
  physicianName         String?
  physicianPhone        String?
  injuries              Json?        // [{ description, year, side, active }]
  chronicPain           String?      // free text; nullable when none
  painAreas             String[]

  // Waiver / signature
  waiverTextSnapshot    String       // frozen copy of coach's waiverText at signing time
  signatureName         String       // client's typed legal name
  signatureIp           String
  signatureUserAgent    String
  signedAt              DateTime

  submittedAt           DateTime @default(now())
  answers               IntakeAnswer[]

  @@index([clientId])
}

// Per-question answers for the custom section.
model IntakeAnswer {
  id                   String              @id @default(cuid())
  responseId           String
  response             IntakeResponse      @relation(fields: [responseId], references: [id], onDelete: Cascade)
  questionId           String
  question             IntakeQuestion      @relation(fields: [questionId], references: [id])

  textValue            String?
  choiceValues         String[]

  // Snapshot the question at the moment the client answered so coach edits don't rewrite history.
  questionTextSnapshot String
  questionTypeSnapshot IntakeQuestionType
  optionsSnapshot      String[]

  @@unique([responseId, questionId])
  @@index([questionId])
}
```

**Key data-model decisions:**

- **Separate `IntakeResponse` table** rather than columns on `Client`: distinct lifecycle (submitted/locked vs. coach-editable notes), waiver-text snapshot lives with the response, re-take = simple `DELETE`.
- **Snapshots on `IntakeAnswer`**: a coach editing or archiving a question later cannot retroactively change what a past client answered.
- **Archived (soft-deleted) questions**: removed from new clients' forms but answers still resolve via FK; avoids breaking historical responses.
- **Injuries as JSON**: the prototype HTML treats injuries as a repeating sub-form with `{description, year, side, active}`. JSON is simpler than a separate table for a max-of-~5-rows array.
- **`Client.healthConditions` / `Client.gender` / `Client.goals` untouched**: they remain coach-curated notes ("what I observed in session 3"), distinct from client-attested intake data. No migration of existing values.

## User flows

### Coach setup

A new setup-checklist item, "Add your liability waiver," blocks the "Invite to App" button until `User.waiverText` is non-empty. Tooltip on the disabled button: "Add your waiver in Settings → Intake first."

A new **Settings → Intake** section (sibling of Profile, Account, Security) contains:

- **Waiver text** — required textarea, hard cap ~10k chars. Helper text: "This is what your clients will sign before their first workout. Use your insurer's or attorney's language. Make clear that disclosure is voluntary and you are not providing medical advice."
- **Custom questions** — list with drag-handle reorder (`position` field), "+ Add question" button. Each row exposes: text input, type dropdown, options editor (visible only for choice types), required toggle, archive button. Archive is soft-delete — archived questions remain in DB so old `IntakeAnswer` rows still resolve, but they are not shown to new clients.

### Client onboarding

The intake gate lives in the `(client)` route-group layout — **not** in `middleware.ts`. The existing middleware is intentionally minimal because Edge runtime cannot decode the NextAuth JWT or hit Prisma; all role/business checks already happen in server components. The intake gate follows the same pattern.

In `app/(client)/layout.tsx` (server component):

```
auth() → if no session, redirect to /login (already handled by middleware)
load the current user's clientProfile with { id, intakeResponseId: select: { id } }
if clientProfile and clientProfile.intakeResponseId is null and path is not /onboarding/intake:
  redirect to /onboarding/intake
```

`/onboarding/intake` itself lives outside the `(client)` group (its own top-level segment) so the layout's gate doesn't redirect-loop. The intake page does its own `auth()` check and rejects non-CLIENT roles.

`/onboarding/intake` is a single-page form (server-component shell + client-component form) with the following sections, in order:

1. **Personal** — DOB, sex, height (inches), weight (lbs), occupation
2. **Medical history** — checklist of conditions (from the prototype HTML) + "other" free text
3. **Medications** — radio (No / Yes — list below) + textarea
4. **Pregnancy / postpartum** — radio (No / Currently pregnant / Postpartum <12mo / N/A)
5. **Physician restrictions** — radio + restriction-detail textarea + physician name + physician phone
6. **Surgeries / injuries** — radio toggle + repeating rows (description, year, side, currently active) + optional notes
7. **Chronic pain** — radio + body-area checklist + detail textarea
8. **Custom questions** — rendered from coach's non-archived `IntakeQuestion`s in `position` order, with the appropriate input type per question
9. **Waiver & signature** — renders coach's `waiverText` verbatim inside a styled block, required checkbox ("I have read and agree"), required typed-name input, "Sign & Submit" button

On submit, `submitIntake` server action:

1. Validates everything in one Zod schema (`lib/validations/intake.ts`).
2. Inside a transaction: creates the `IntakeResponse` (snapshotting `waiverText` and capturing IP + UA from request headers), then creates `IntakeAnswer` rows with question snapshots.
3. Errors if a response already exists for this client (idempotency guard against double-submit).
4. Redirects to `/dashboard`.

No "save draft" or multi-step navigation in MVP — single scrolling page, all sections visible, client scrolls. Matches the prototype HTML's structure and ships faster.

### Coach review

A new **"Intake" tab** on `/(coach)/clients/[id]` alongside existing tabs.

- If the client has an `IntakeResponse`: read-only summary grouped by section, with the signed-waiver block at the top showing `waiverTextSnapshot`, `signatureName`, `signedAt`, and `signatureIp`. A "Request re-take" button at the bottom opens a confirm dialog ("This will permanently delete their current intake. They'll be prompted to refill it on next login. Continue?") and calls `requestIntakeRetake`.
- If no `IntakeResponse`: status badge "Intake pending — client will complete on first login," plus a reminder to resend the invite if not yet active.

## Server actions and validation

New file `lib/actions/intake.ts`:

- `submitIntake(formData)` — client-only; idempotent; runs the full validation + transactional insert described above.
- `requestIntakeRetake(clientId)` — coach-only; verifies coach owns the client; deletes the response (cascade deletes answers); revalidates the client detail page.

New file `lib/actions/coach-intake-config.ts`:

- `updateWaiverText(text)` — coach-only; max length 10,000 chars.
- `createIntakeQuestion(input)`, `updateIntakeQuestion(id, input)`, `archiveIntakeQuestion(id)`, `reorderIntakeQuestions(orderedIds[])`.

New file `lib/validations/intake.ts` — all Zod schemas mirroring the action surface. Server enforces:

- `signatureName` length ≥ 2.
- Waiver checkbox is `true`.
- All required custom questions are answered.
- `injuries` JSON validated row-by-row (description string, year 1900–current+1, side enum, active boolean).
- Numeric ranges on height/weight (sanity bounds: height 12–120 in, weight 30–1500 lbs).
- All free-text fields capped at sensible lengths (typically 500 or 5000 chars depending on context).

## UI surfaces touched / added

**Added:**

- `app/(coach)/settings/intake/page.tsx` (or a section in existing settings, depending on the file's current structure)
- `app/(coach)/settings/intake/waiver-section.tsx` (client component for waiver textarea)
- `app/(coach)/settings/intake/questions-section.tsx` (client component for question builder)
- `app/(client)/onboarding/intake/page.tsx` (server shell)
- `app/(client)/onboarding/intake/intake-form.tsx` (client form)
- `app/(coach)/clients/[id]/intake-tab.tsx` (component used by client-tabs.tsx)
- `lib/actions/intake.ts`
- `lib/actions/coach-intake-config.ts`
- `lib/validations/intake.ts`
- `app/(client)/layout.tsx` — add intake gate (server component, NOT Edge middleware)

**Modified:**

- `app/welcome/welcome-wizard.tsx` — drop the slug step; collapse to 2 steps; rewrite the completion screen
- `app/welcome/page.tsx` — adjust default values passed to the wizard
- `lib/actions/coach-profile.ts` — `completeOnboarding` no longer accepts/requires `intakeSlug`; `checkSlugAvailable` stays unused for now
- `app/(coach)/setup-checklist.tsx` — remove any "share your intake URL" item; add "Add your liability waiver"
- `app/(coach)/settings/coach-profile-section.tsx` — remove the intake-slug field
- `app/(coach)/clients/[id]/client-tabs.tsx` — add the new Intake tab
- `components/invite-client-button.tsx` — disable when coach has no waiver, with explanatory tooltip
- `app/admin/coaches/[id]/page.tsx`, `app/admin/coaches/page.tsx` — drop the slug column / row; replace with a "Waiver set?" indicator
- `prisma/schema.prisma` — add models above

**Untouched in this PR:** `User.intakeSlug` column remains (dropped in a follow-up migration once we're sure nothing reads it).

## Rollout / migration of existing clients

When this ships, every currently-active client has no `IntakeResponse`. The middleware will gate them out of `/dashboard` on next login until they complete the form. Two options:

- **(a) Hard cutover** *(recommended)* — every existing client fills the form. Brief disruption (~5–10 minutes per client, once), but the coach immediately has signed waivers across the board. No migration code needed.
- **(b) Grandfather** — backfill an `IntakeResponse` row for every existing client with synthetic placeholder values and a `signatureName = "[imported — pre-intake]"` marker. Lower friction, but coaches do not actually have signatures from those clients and the placeholder data is meaningless.

Recommendation: **(a)**. Communicate to the active coach (single user today) so they can give their clients a heads-up.

## Implementation order

Each step is sized to ship independently green:

1. **Schema migration + `prisma generate`** — no UI yet.
2. **Coach settings → Intake section** — waiver textarea + question builder + their server actions. Coach can configure but nothing renders client-side yet.
3. **Setup checklist + invite gating** — block the invite button when `waiverText` is empty.
4. **Welcome-wizard cleanup** — remove the slug step, update the completion screen.
5. **Client onboarding form** — `/onboarding/intake` + `submitIntake` action + middleware gate.
6. **Coach client-detail "Intake" tab** — read-only view + `requestIntakeRetake` action.
7. **Admin view cleanup** — replace slug references with a waiver-set indicator.

## Open questions / risks

- **Hard cutover vs grandfather** (above) — coach to confirm at review time. Default to hard cutover.
- **Pre-existing User row on invite** (separate bug, already fixed in this session at `lib/actions/auth.ts:407-429`) — the intake design assumes the invite flow correctly verifies emails and sets passwords, which is now true.
- **Custom-question reorder UX** — drag handles assume mouse / touch input; need a keyboard-accessible fallback (up/down buttons). Spec'd as standard `position` integer; implementation should include keyboard controls.
- **Question type changes after answers exist** — if a coach changes a question from `SHORT_TEXT` to `SINGLE_CHOICE`, what happens? The snapshot on `IntakeAnswer` preserves the old type for historical answers, but new answers will use the new type. Acceptable; no special handling.
