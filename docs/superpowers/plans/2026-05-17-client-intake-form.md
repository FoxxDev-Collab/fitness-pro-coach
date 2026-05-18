# Client Intake & Waiver Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a required health/medical intake form with a coach-supplied liability waiver that every CLIENT must complete on first login before they can access `/dashboard` or workouts. Replace the now-defunct "public intake URL" promised by the welcome wizard.

**Architecture:** Three new Prisma models (`IntakeQuestion`, `IntakeResponse`, `IntakeAnswer`) plus `User.waiverText`. Coach configures waiver text and custom add-on questions in **Settings → Intake**. Client is gated by `app/(client)/layout.tsx` (server component, **not** Edge middleware — Edge can't run Prisma). Submission is one server action with transactional inserts. Snapshot question text/type/options on each answer so coach edits don't rewrite history. Re-take = delete `IntakeResponse` (cascade).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Prisma 7 with `@prisma/adapter-pg`, NextAuth v5, Zod 4, shadcn/Radix UI, Lucide icons. No test framework installed — verification uses `npm run lint` + `npm run build` + manual dev-server smoke testing.

**Spec reference:** `docs/superpowers/specs/2026-05-17-client-intake-form-design.md`

---

## File map

**New files:**
- `prisma/migrations/<timestamp>_add_intake_models/migration.sql` (Prisma-generated)
- `lib/validations/intake.ts` — Zod schemas for waiver + questions + submission
- `lib/actions/coach-intake-config.ts` — coach-side server actions (waiver text, CRUD on questions)
- `lib/actions/intake.ts` — client-side `submitIntake` + coach-side `requestIntakeRetake`
- `app/(coach)/settings/intake-section.tsx` — coach Settings → Intake UI (waiver + question builder)
- `app/onboarding/layout.tsx` — minimal layout for the intake page (avoids `(client)` redirect loop)
- `app/onboarding/intake/page.tsx` — server shell that loads coach's waiver + questions
- `app/onboarding/intake/intake-form.tsx` — client component, full form with all sections
- `app/(coach)/clients/[id]/intake-tab.tsx` — read-only intake response view + re-take button
- `app/(coach)/clients/[id]/request-retake-button.tsx` — confirm dialog + action wrapper

**Modified files:**
- `prisma/schema.prisma` — add models, enum, and `User.waiverText`
- `app/(client)/layout.tsx` — add intake-completion gate
- `app/(coach)/settings/page.tsx` — render new `IntakeSection`
- `app/(coach)/settings/settings-client.tsx` — no change unless slug ref appears; verify
- `app/(coach)/settings/coach-profile-section.tsx` — drop the intake-slug field
- `app/welcome/welcome-wizard.tsx` — drop slug step, collapse to 2 steps, rewrite completion screen
- `app/welcome/page.tsx` — drop `initialSlug` prop / DB read
- `app/(coach)/setup-checklist.tsx` — replace "Customize your intake link" with "Add your liability waiver"
- `app/(coach)/page.tsx` — pass `hasWaiver` instead of `hasIntakeSlug` to checklist
- `lib/actions/coach-profile.ts` — `getSetupProgress` returns `hasWaiver` instead of `hasIntakeSlug`/`intakeSlug`
- `lib/validations/coach-profile.ts` — drop `intakeSlug` from `updateCoachProfileSchema` (or mark optional, no-op)
- `components/invite-client-button.tsx` — disable when coach has no `waiverText`, with tooltip
- `lib/actions/invites.ts` — server-side guard: error if coach `waiverText` is empty
- `app/(coach)/clients/[id]/page.tsx` — pass intake data to client-tabs
- `app/(coach)/clients/[id]/client-tabs.tsx` — add Intake tab
- `app/admin/coaches/[id]/page.tsx` — replace `intakeSlug` display with "Waiver set?" indicator
- `app/admin/coaches/page.tsx` — same
- `lib/actions/admin.ts` — `exportCoachesCsv` (line ~611): drop `intakeSlug`, add `hasWaiver`

**Not touched in this PR:**
- `User.intakeSlug` column stays. UI references removed. A follow-up PR drops the column in a separate migration once we're sure nothing reads it.
- `checkSlugAvailable`, `generateUniqueSlug`, `normalizeSlug` in `lib/actions/coach-profile.ts` — left in place (unused after this PR), removed in the follow-up cleanup PR.
- `Client.healthConditions` / `Client.gender` / `Client.goals` — remain coach-curated notes.

---

## Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_intake_models/migration.sql` (Prisma-generated)

- [ ] **Step 1.1: Add the enum, models, and `User.waiverText` field to `prisma/schema.prisma`**

At the end of `prisma/schema.prisma`, append:

```prisma
enum IntakeQuestionType {
  SHORT_TEXT
  LONG_TEXT
  SINGLE_CHOICE
  MULTI_CHOICE
}

model IntakeQuestion {
  id        String             @id @default(cuid())
  coachId   String
  coach     User               @relation("CoachIntakeQuestions", fields: [coachId], references: [id], onDelete: Cascade)
  text      String
  type      IntakeQuestionType
  options   String[]
  required  Boolean            @default(false)
  position  Int                @default(0)
  archived  Boolean            @default(false)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
  answers   IntakeAnswer[]

  @@index([coachId])
}

model IntakeResponse {
  id                    String         @id @default(cuid())
  clientId              String         @unique
  client                Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)

  dateOfBirth           DateTime?
  sex                   String?
  heightInches          Int?
  weightLbs             Float?
  occupation            String?

  medicalConditions     String[]
  conditionsOther       String?
  medications           String?
  pregnancyStatus       String?
  physicianRestrictions String?
  physicianName         String?
  physicianPhone        String?
  injuries              Json?
  chronicPain           String?
  painAreas             String[]

  waiverTextSnapshot    String
  signatureName         String
  signatureIp           String
  signatureUserAgent    String
  signedAt              DateTime

  submittedAt           DateTime       @default(now())
  answers               IntakeAnswer[]

  @@index([clientId])
}

model IntakeAnswer {
  id                   String             @id @default(cuid())
  responseId           String
  response             IntakeResponse     @relation(fields: [responseId], references: [id], onDelete: Cascade)
  questionId           String
  question             IntakeQuestion     @relation(fields: [questionId], references: [id])

  textValue            String?
  choiceValues         String[]

  questionTextSnapshot String
  questionTypeSnapshot IntakeQuestionType
  optionsSnapshot      String[]

  @@unique([responseId, questionId])
  @@index([questionId])
}
```

Then update the `User` model: inside the existing `model User { ... }` block, add `waiverText String?` near the other coach-profile fields (after `intakeSlug`), and add the back-relation `intakeQuestions IntakeQuestion[] @relation("CoachIntakeQuestions")` near the other coach relations.

Then update the `Client` model: add the back-relation `intakeResponse IntakeResponse?` to the relations list (near the other relations like `assignments`, `measurements`, `clientNotes`).

- [ ] **Step 1.2: Create the migration**

Run: `npx prisma migrate dev --name add_intake_models`
Expected: migration directory created under `prisma/migrations/<timestamp>_add_intake_models/`, schema applied to dev DB, Prisma client regenerated. If it warns about data loss, **abort** — this migration is purely additive.

- [ ] **Step 1.3: Verify the schema typechecks**

Run: `npm run lint`
Expected: no new errors. Prisma types should resolve for `db.intakeQuestion`, `db.intakeResponse`, `db.intakeAnswer`.

- [ ] **Step 1.4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(intake): add IntakeQuestion, IntakeResponse, IntakeAnswer models + User.waiverText"
```

---

## Task 2: Validation schemas

**Files:**
- Create: `lib/validations/intake.ts`

- [ ] **Step 2.1: Create `lib/validations/intake.ts` with the full validation surface**

```typescript
import { z } from "zod";

// ─── Shared helpers ──────────────────────────────────────

const trimmedString = (max: number) =>
  z.string().trim().max(max);

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional().transform((s) => (s ? s : null));

const optionalNullableString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().max(max).nullable().optional().transform((s) => (s == null || s === "" ? null : s)),
  );

// ─── Waiver text (coach Settings) ────────────────────────

export const updateWaiverTextSchema = z.object({
  waiverText: z.string().trim().min(20, "Waiver must be at least 20 characters").max(10000, "Waiver is too long (max 10,000 characters)"),
});
export type UpdateWaiverTextInput = z.infer<typeof updateWaiverTextSchema>;

// ─── Intake questions (coach Settings) ───────────────────

export const intakeQuestionTypeEnum = z.enum(["SHORT_TEXT", "LONG_TEXT", "SINGLE_CHOICE", "MULTI_CHOICE"]);
export type IntakeQuestionTypeValue = z.infer<typeof intakeQuestionTypeEnum>;

export const createIntakeQuestionSchema = z.object({
  text: z.string().trim().min(2, "Question text is required").max(500),
  type: intakeQuestionTypeEnum,
  options: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  required: z.boolean().default(false),
}).refine(
  (q) => (q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") ? q.options.length === 0 : q.options.length >= 2,
  { message: "Choice questions need at least 2 options; text questions must not have options.", path: ["options"] },
);
export type CreateIntakeQuestionInput = z.infer<typeof createIntakeQuestionSchema>;

export const updateIntakeQuestionSchema = createIntakeQuestionSchema;

export const reorderQuestionsSchema = z.object({
  orderedIds: z.array(z.string().regex(/^[a-z0-9]{20,40}$/)).min(1).max(200),
});

// ─── Intake submission (client) ──────────────────────────

const injurySchema = z.object({
  description: z.string().trim().min(1).max(200),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  side: z.enum(["Left", "Right", "Both", "N/A"]),
  active: z.boolean(),
});

const customAnswerSchema = z.object({
  questionId: z.string().regex(/^[a-z0-9]{20,40}$/),
  textValue: z.string().max(5000).optional().transform((s) => s ?? null),
  choiceValues: z.array(z.string().max(200)).max(20).optional().transform((a) => a ?? []),
});

export const submitIntakeSchema = z.object({
  // Personal
  dateOfBirth: z.string().optional().transform((s) => (s ? new Date(s) : null)),
  sex: optionalNullableString(40),
  heightInches: z.coerce.number().int().min(12).max(120).nullable().optional().transform((v) => v ?? null),
  weightLbs: z.coerce.number().min(30).max(1500).nullable().optional().transform((v) => v ?? null),
  occupation: optionalNullableString(120),

  // Medical
  medicalConditions: z.array(z.string().max(120)).max(50).default([]),
  conditionsOther: optionalNullableString(500),
  medications: optionalNullableString(2000),
  pregnancyStatus: optionalNullableString(40),
  physicianRestrictions: optionalNullableString(2000),
  physicianName: optionalNullableString(120),
  physicianPhone: optionalNullableString(40),
  injuries: z.array(injurySchema).max(20).default([]),
  chronicPain: optionalNullableString(2000),
  painAreas: z.array(z.string().max(80)).max(40).default([]),

  // Custom answers
  customAnswers: z.array(customAnswerSchema).max(200).default([]),

  // Signature
  agreeWaiver: z.literal(true, { message: "You must agree to the waiver to continue" }),
  signatureName: z.string().trim().min(2, "Please type your full legal name").max(120),
});
export type SubmitIntakeInput = z.infer<typeof submitIntakeSchema>;
```

- [ ] **Step 2.2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 2.3: Commit**

```bash
git add lib/validations/intake.ts
git commit -m "feat(intake): zod validation schemas for waiver, questions, and submission"
```

---

## Task 3: Coach-side server actions — waiver and question CRUD

**Files:**
- Create: `lib/actions/coach-intake-config.ts`

- [ ] **Step 3.1: Create `lib/actions/coach-intake-config.ts`**

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { parseInput } from "@/lib/validations";
import {
  updateWaiverTextSchema,
  createIntakeQuestionSchema,
  updateIntakeQuestionSchema,
  reorderQuestionsSchema,
  type UpdateWaiverTextInput,
  type CreateIntakeQuestionInput,
} from "@/lib/validations/intake";

const cuidRegex = /^[a-z0-9]{20,40}$/;

export async function updateWaiverText(input: UpdateWaiverTextInput) {
  const parsed = parseInput(updateWaiverTextSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();
  await db.user.update({
    where: { id: coachId },
    data: { waiverText: parsed.data.waiverText },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

export async function createIntakeQuestion(input: CreateIntakeQuestionInput) {
  const parsed = parseInput(createIntakeQuestionSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();
  const maxPosition = await db.intakeQuestion.aggregate({
    where: { coachId, archived: false },
    _max: { position: true },
  });
  const nextPosition = (maxPosition._max.position ?? -1) + 1;

  const question = await db.intakeQuestion.create({
    data: {
      coachId,
      text: parsed.data.text,
      type: parsed.data.type,
      options: parsed.data.options,
      required: parsed.data.required,
      position: nextPosition,
    },
  });

  revalidatePath("/settings");
  return { success: true, question };
}

export async function updateIntakeQuestion(id: string, input: CreateIntakeQuestionInput) {
  if (!cuidRegex.test(id)) return { error: "Invalid question id" };
  const parsed = parseInput(updateIntakeQuestionSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();
  const existing = await db.intakeQuestion.findFirst({ where: { id, coachId } });
  if (!existing) return { error: "Question not found" };

  await db.intakeQuestion.update({
    where: { id },
    data: {
      text: parsed.data.text,
      type: parsed.data.type,
      options: parsed.data.options,
      required: parsed.data.required,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function archiveIntakeQuestion(id: string) {
  if (!cuidRegex.test(id)) return { error: "Invalid question id" };
  const coachId = await getCoachId();
  const existing = await db.intakeQuestion.findFirst({ where: { id, coachId } });
  if (!existing) return { error: "Question not found" };

  await db.intakeQuestion.update({
    where: { id },
    data: { archived: true },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function reorderIntakeQuestions(orderedIds: string[]) {
  const parsed = parseInput(reorderQuestionsSchema, { orderedIds });
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();
  const owned = await db.intakeQuestion.findMany({
    where: { id: { in: parsed.data.orderedIds }, coachId },
    select: { id: true },
  });
  if (owned.length !== parsed.data.orderedIds.length) {
    return { error: "Some questions don't belong to you" };
  }

  await db.$transaction(
    parsed.data.orderedIds.map((id, idx) =>
      db.intakeQuestion.update({ where: { id }, data: { position: idx } }),
    ),
  );

  revalidatePath("/settings");
  return { success: true };
}

export async function getCoachIntakeConfig() {
  const coachId = await getCoachId();
  const [user, questions] = await Promise.all([
    db.user.findUnique({
      where: { id: coachId },
      select: { waiverText: true },
    }),
    db.intakeQuestion.findMany({
      where: { coachId, archived: false },
      orderBy: { position: "asc" },
    }),
  ]);
  return {
    waiverText: user?.waiverText ?? "",
    questions,
  };
}
```

- [ ] **Step 3.2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3.3: Commit**

```bash
git add lib/actions/coach-intake-config.ts
git commit -m "feat(intake): coach-side server actions for waiver text and question CRUD"
```

---

## Task 4: Client-side server actions — submit and re-take

**Files:**
- Create: `lib/actions/intake.ts`

- [ ] **Step 4.1: Create `lib/actions/intake.ts`**

```typescript
"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getEffectiveSession, requireClient, getCoachId } from "@/lib/auth-utils";
import { parseInput } from "@/lib/validations";
import { submitIntakeSchema, type SubmitIntakeInput } from "@/lib/validations/intake";

const cuidRegex = /^[a-z0-9]{20,40}$/;

export async function getIntakeBundle() {
  const session = await requireClient();

  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      coachId: true,
      intakeResponse: { select: { id: true } },
    },
  });
  if (!client?.coachId) throw new Error("Client has no assigned coach");

  const coach = await db.user.findUnique({
    where: { id: client.coachId },
    select: { name: true, businessName: true, waiverText: true },
  });
  if (!coach?.waiverText) throw new Error("Your coach hasn't set up their waiver yet — please contact them.");

  const questions = await db.intakeQuestion.findMany({
    where: { coachId: client.coachId, archived: false },
    orderBy: { position: "asc" },
  });

  return {
    clientId: client.id,
    clientName: client.name,
    alreadySubmitted: !!client.intakeResponse,
    coachName: coach.businessName || coach.name || "Your Coach",
    waiverText: coach.waiverText,
    questions,
  };
}

export async function submitIntake(input: SubmitIntakeInput) {
  const session = await requireClient();
  const parsed = parseInput(submitIntakeSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      coachId: true,
      intakeResponse: { select: { id: true } },
    },
  });
  if (!client) return { error: "Client profile not found" };
  if (!client.coachId) return { error: "No assigned coach" };
  if (client.intakeResponse) return { error: "Intake already submitted" };

  const coach = await db.user.findUnique({
    where: { id: client.coachId },
    select: { waiverText: true },
  });
  if (!coach?.waiverText) return { error: "Your coach hasn't set up their waiver yet" };

  // Snapshot all questions referenced by customAnswers, validating they belong to the coach.
  const questionIds = parsed.data.customAnswers.map((a) => a.questionId);
  const questions = questionIds.length > 0
    ? await db.intakeQuestion.findMany({
        where: { id: { in: questionIds }, coachId: client.coachId },
      })
    : [];
  if (questions.length !== questionIds.length) {
    return { error: "Some custom answers reference invalid questions" };
  }
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  // Verify required questions are answered.
  const allCoachQuestions = await db.intakeQuestion.findMany({
    where: { coachId: client.coachId, archived: false, required: true },
    select: { id: true, text: true },
  });
  const answeredIds = new Set(parsed.data.customAnswers
    .filter((a) => (a.textValue && a.textValue.trim() !== "") || a.choiceValues.length > 0)
    .map((a) => a.questionId));
  const missing = allCoachQuestions.filter((q) => !answeredIds.has(q.id));
  if (missing.length > 0) {
    return { error: `Please answer: ${missing.map((q) => q.text).join(", ")}` };
  }

  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
  const userAgent = hdrs.get("user-agent") || "unknown";

  await db.$transaction(async (tx) => {
    const response = await tx.intakeResponse.create({
      data: {
        clientId: client.id,
        dateOfBirth: parsed.data.dateOfBirth,
        sex: parsed.data.sex,
        heightInches: parsed.data.heightInches,
        weightLbs: parsed.data.weightLbs,
        occupation: parsed.data.occupation,
        medicalConditions: parsed.data.medicalConditions,
        conditionsOther: parsed.data.conditionsOther,
        medications: parsed.data.medications,
        pregnancyStatus: parsed.data.pregnancyStatus,
        physicianRestrictions: parsed.data.physicianRestrictions,
        physicianName: parsed.data.physicianName,
        physicianPhone: parsed.data.physicianPhone,
        injuries: parsed.data.injuries.length > 0 ? parsed.data.injuries : null,
        chronicPain: parsed.data.chronicPain,
        painAreas: parsed.data.painAreas,
        waiverTextSnapshot: coach.waiverText!,
        signatureName: parsed.data.signatureName,
        signatureIp: ip,
        signatureUserAgent: userAgent,
        signedAt: new Date(),
      },
    });

    if (parsed.data.customAnswers.length > 0) {
      await tx.intakeAnswer.createMany({
        data: parsed.data.customAnswers.map((a) => {
          const q = questionsById.get(a.questionId)!;
          return {
            responseId: response.id,
            questionId: q.id,
            textValue: a.textValue,
            choiceValues: a.choiceValues,
            questionTextSnapshot: q.text,
            questionTypeSnapshot: q.type,
            optionsSnapshot: q.options,
          };
        }),
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/onboarding/intake");
  return { success: true };
}

export async function requestIntakeRetake(clientId: string) {
  if (!cuidRegex.test(clientId)) return { error: "Invalid client id" };
  const coachId = await getCoachId();

  const client = await db.client.findFirst({
    where: { id: clientId, coachId },
    select: { id: true, intakeResponse: { select: { id: true } } },
  });
  if (!client) return { error: "Client not found" };
  if (!client.intakeResponse) return { error: "No intake response to clear" };

  await db.intakeResponse.delete({ where: { id: client.intakeResponse.id } });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function getClientIntakeForCoach(clientId: string) {
  if (!cuidRegex.test(clientId)) return null;
  const coachId = await getCoachId();
  const client = await db.client.findFirst({
    where: { id: clientId, coachId },
    select: {
      id: true,
      intakeResponse: {
        include: {
          answers: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
  });
  return client?.intakeResponse ?? null;
}
```

- [ ] **Step 4.2: Verify lint passes**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4.3: Commit**

```bash
git add lib/actions/intake.ts
git commit -m "feat(intake): client submitIntake + coach requestIntakeRetake server actions"
```

---

## Task 5: Coach Settings → Intake section UI

**Files:**
- Create: `app/(coach)/settings/intake-section.tsx`
- Modify: `app/(coach)/settings/page.tsx`

- [ ] **Step 5.1: Create `app/(coach)/settings/intake-section.tsx`**

This is a single client component that handles both the waiver textarea and the question builder. Use the existing Card / Button / Input / Textarea / Label patterns from `settings-client.tsx`.

```typescript
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Plus, X, ChevronUp, ChevronDown, Loader2, Check } from "lucide-react";
import {
  updateWaiverText,
  createIntakeQuestion,
  updateIntakeQuestion,
  archiveIntakeQuestion,
  reorderIntakeQuestions,
} from "@/lib/actions/coach-intake-config";

type QuestionType = "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTI_CHOICE";

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  position: number;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  SINGLE_CHOICE: "Single choice",
  MULTI_CHOICE: "Multiple choice",
};

export function IntakeSection({
  initialWaiverText,
  initialQuestions,
}: {
  initialWaiverText: string;
  initialQuestions: Question[];
}) {
  return (
    <div className="space-y-6">
      <WaiverCard initial={initialWaiverText} />
      <QuestionsCard initial={initialQuestions} />
    </div>
  );
}

function WaiverCard({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      const result = await updateWaiverText({ waiverText: text });
      if (result.error) setMsg({ type: "error", text: result.error });
      else setMsg({ type: "success", text: "Waiver saved" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="size-4" /> Liability waiver
          {!initial && <Badge variant="outline" className="border-warning/50 text-warning">Required</Badge>}
        </CardTitle>
        <CardDescription>
          Your clients sign this before their first workout. Use your insurer&apos;s or attorney&apos;s language. Make clear that disclosure is voluntary and you are not providing medical advice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {msg && (
          <div className={`rounded-md border p-3 text-sm ${
            msg.type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-success/50 bg-success/10 text-success"
          }`}>{msg.text}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="waiver">Waiver text</Label>
          <Textarea
            id="waiver"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            maxLength={10000}
            placeholder="Paste your liability waiver / informed-consent text here..."
          />
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {text.length} / 10,000
          </p>
        </div>
        <Button onClick={handleSave} disabled={pending || text.trim().length < 20}>
          {pending ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...</> : "Save waiver"}
        </Button>
      </CardContent>
    </Card>
  );
}

function QuestionsCard({ initial }: { initial: Question[] }) {
  const [questions, setQuestions] = useState<Question[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function move(id: string, dir: -1 | 1) {
    const idx = questions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const next = [...questions];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setQuestions(next);
    startTransition(async () => {
      const result = await reorderIntakeQuestions(next.map((q) => q.id));
      if (result.error) {
        setMsg({ type: "error", text: result.error });
        setQuestions(questions); // revert
      }
    });
  }

  function handleArchive(id: string) {
    if (!confirm("Archive this question? Existing answers will be preserved but new clients won't see it.")) return;
    startTransition(async () => {
      const result = await archiveIntakeQuestion(id);
      if (result.error) setMsg({ type: "error", text: result.error });
      else setQuestions((qs) => qs.filter((q) => q.id !== id));
    });
  }

  function handleSaveNew(q: Question) {
    setQuestions((qs) => [...qs, q]);
    setAdding(false);
  }
  function handleSaveEdit(q: Question) {
    setQuestions((qs) => qs.map((x) => x.id === q.id ? q : x));
    setEditingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Additional intake questions</CardTitle>
        <CardDescription>
          Optional. Added after the standard health section. Drag/move to reorder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {msg && (
          <div className={`rounded-md border p-3 text-sm ${
            msg.type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-success/50 bg-success/10 text-success"
          }`}>{msg.text}</div>
        )}
        {questions.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground italic">No custom questions yet.</p>
        )}
        <ul className="space-y-2">
          {questions.map((q, i) => editingId === q.id ? (
            <QuestionEditor
              key={q.id}
              initial={q}
              onCancel={() => setEditingId(null)}
              onSaved={handleSaveEdit}
            />
          ) : (
            <li key={q.id} className="rounded-md border p-3 flex items-start gap-3">
              <div className="flex flex-col">
                <Button size="icon-sm" variant="ghost" onClick={() => move(q.id, -1)} disabled={i === 0 || pending} aria-label="Move up">
                  <ChevronUp className="size-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => move(q.id, 1)} disabled={i === questions.length - 1 || pending} aria-label="Move down">
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{q.text}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[q.type]}{q.required ? " · Required" : ""}
                  {q.options.length > 0 && ` · ${q.options.length} options`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditingId(q.id)} disabled={pending}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleArchive(q.id)} disabled={pending}>
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {adding ? (
          <QuestionEditor onCancel={() => setAdding(false)} onSaved={handleSaveNew} />
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4 mr-1.5" /> Add question
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: Question;
  onCancel: () => void;
  onSaved: (q: Question) => void;
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [type, setType] = useState<QuestionType>(initial?.type ?? "SHORT_TEXT");
  const [options, setOptions] = useState<string[]>(initial?.options ?? []);
  const [required, setRequired] = useState<boolean>(initial?.required ?? false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isChoice = type === "SINGLE_CHOICE" || type === "MULTI_CHOICE";

  function handleSave() {
    setError(null);
    const input = { text, type, options: isChoice ? options : [], required };
    startTransition(async () => {
      const result = initial
        ? await updateIntakeQuestion(initial.id, input)
        : await createIntakeQuestion(input);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      const saved: Question =
        initial
          ? { ...initial, ...input }
          : { ...(result as { question: Question }).question };
      onSaved(saved);
    });
  }

  return (
    <li className="rounded-md border p-3 space-y-3 bg-muted/30">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
      )}
      <div className="space-y-2">
        <Label>Question text</Label>
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="e.g., What are your top three fitness goals?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SHORT_TEXT">Short text</SelectItem>
              <SelectItem value="LONG_TEXT">Long text</SelectItem>
              <SelectItem value="SINGLE_CHOICE">Single choice (radio)</SelectItem>
              <SelectItem value="MULTI_CHOICE">Multiple choice (checkboxes)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Required?</Label>
          <Button type="button" variant={required ? "default" : "outline"} size="sm" onClick={() => setRequired(!required)}>
            {required ? <><Check className="size-4 mr-1.5" /> Required</> : "Optional"}
          </Button>
        </div>
      </div>
      {isChoice && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={opt}
                onChange={(e) => setOptions(options.map((o, j) => j === i ? e.target.value : o))}
                maxLength={200}
              />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOptions(options.filter((_, j) => j !== i))} aria-label="Remove option">
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>
            <Plus className="size-4 mr-1.5" /> Add option
          </Button>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="button" onClick={handleSave} disabled={pending || text.trim().length < 2}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </li>
  );
}
```

- [ ] **Step 5.2: Modify `app/(coach)/settings/page.tsx` to render the new section**

Replace the file's contents with:

```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { CoachProfileSection } from "./coach-profile-section";
import { IntakeSection } from "./intake-section";
import { getCoachIntakeConfig } from "@/lib/actions/coach-intake-config";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      mfaEnabled: true,
      createdAt: true,
      businessName: true,
      specialty: true,
      bio: true,
      timezone: true,
    },
  });

  if (!user) redirect("/login");

  const intakeConfig = session.user.role === "COACH" ? await getCoachIntakeConfig() : null;

  return (
    <div className="space-y-6">
      <SettingsClient
        name={user.name || ""}
        email={user.email}
        emailVerified={!!user.emailVerified}
        mfaEnabled={user.mfaEnabled}
        joinedAt={user.createdAt.toISOString()}
      />
      {session.user.role === "COACH" && (
        <>
          <CoachProfileSection
            businessName={user.businessName ?? ""}
            specialty={user.specialty ?? ""}
            bio={user.bio ?? ""}
            timezone={user.timezone ?? ""}
          />
          {intakeConfig && (
            <IntakeSection
              initialWaiverText={intakeConfig.waiverText}
              initialQuestions={intakeConfig.questions.map((q) => ({
                id: q.id,
                text: q.text,
                type: q.type,
                options: q.options,
                required: q.required,
                position: q.position,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5.3: Update `app/(coach)/settings/coach-profile-section.tsx` to drop the intakeSlug prop and field**

Read the file, locate the `intakeSlug` prop and its JSX, and remove both. The component should no longer accept or render `intakeSlug`. Adjust the form-submission call to `updateCoachProfile` so it no longer sends `intakeSlug`.

- [ ] **Step 5.4: Verify lint passes and build succeeds**

Run: `npm run lint && npm run build`
Expected: clean lint, build succeeds.

- [ ] **Step 5.5: Manual smoke test**

Run: `npm run dev`. Log in as a coach. Navigate to `/settings`. Verify:
- The new "Liability waiver" card appears below the existing sections.
- Save with empty text → button disabled.
- Save with "Hello world" (less than 20 chars) → error shown.
- Save with a real waiver → success message.
- Add a custom question → appears in the list.
- Edit a question → changes persist after reload.
- Reorder questions → changes persist.
- Archive a question → disappears from list.

- [ ] **Step 5.6: Commit**

```bash
git add app/\(coach\)/settings/intake-section.tsx app/\(coach\)/settings/page.tsx app/\(coach\)/settings/coach-profile-section.tsx
git commit -m "feat(intake): coach Settings UI for waiver text and custom questions"
```

---

## Task 6: Setup checklist + invite gating

**Files:**
- Modify: `lib/actions/coach-profile.ts`
- Modify: `app/(coach)/setup-checklist.tsx`
- Modify: `app/(coach)/page.tsx`
- Modify: `components/invite-client-button.tsx`
- Modify: `lib/actions/invites.ts`

- [ ] **Step 6.1: Update `lib/actions/coach-profile.ts` — `getSetupProgress` returns `hasWaiver` instead of `hasIntakeSlug`/`intakeSlug`**

In `getSetupProgress` (around line 137):
- Change the `select` block to include `waiverText: true` and remove `intakeSlug: true`.
- Change the return to expose `hasWaiver: !!user.waiverText` instead of `hasIntakeSlug` and `intakeSlug`.

Final shape:
```typescript
return {
  profileComplete,
  hasClient: clientCount > 0,
  hasProgram: programCount > 0,
  hasAssignment: assignmentCount > 0,
  hasWaiver: !!user.waiverText,
  onboardedAt: user.onboardedAt,
  checklistDismissed: !!user.setupChecklistDismissedAt,
};
```

- [ ] **Step 6.2: Update `app/(coach)/setup-checklist.tsx`**

Replace the existing checklist item for "Customize your intake link" (the one keyed off `hasIntakeSlug` / `intakeSlug`) with a "Add your liability waiver" item keyed off `hasWaiver`. Update the props interface:

```typescript
export function SetupChecklist({
  profileComplete,
  hasClient,
  hasProgram,
  hasAssignment,
  hasWaiver,
}: {
  profileComplete: boolean;
  hasClient: boolean;
  hasProgram: boolean;
  hasAssignment: boolean;
  hasWaiver: boolean;
}) {
```

Replace the item block in `items` (the one with `hasIntakeSlug` / `intakeSlug`) with:

```typescript
{
  done: hasWaiver,
  label: "Add your liability waiver",
  hint: "Required before you can invite clients",
  href: "/settings",
  cta: "Add waiver",
},
```

Also update the "Add your first client" item's `hint` from "Or wait for a submission from your intake link" to `"Their account is created when you send the invite"`.

- [ ] **Step 6.3: Update `app/(coach)/page.tsx`**

In the dashboard page (around line 31-34):
- Change `setup.hasIntakeSlug` to `setup.hasWaiver` in the `showChecklist` condition.
- Update the `<SetupChecklist>` props (around line 47-54): pass `hasWaiver={setup.hasWaiver}`, remove `hasIntakeSlug` and `intakeSlug` props.

- [ ] **Step 6.4: Update `components/invite-client-button.tsx` to gate by waiver**

Add a `hasWaiver` prop. When `hasWaiver` is false, render a disabled button with tooltip text.

Replace the component signature and the early returns:

```typescript
export function InviteClientButton({
  clientId,
  hasEmail,
  hasWaiver,
  inviteStatus,
}: {
  clientId: string;
  hasEmail: boolean;
  hasWaiver: boolean;
  inviteStatus: "none" | "pending" | "active" | null;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (inviteStatus === "active") {
    return (
      <Button variant="outline" size="sm" disabled>
        <Check className="size-4 mr-1.5" />
        Account Active
      </Button>
    );
  }

  if (!hasEmail) {
    return (
      <Button variant="outline" size="sm" disabled title="Add client email first">
        <Send className="size-4 mr-1.5" />
        No email
      </Button>
    );
  }

  if (!hasWaiver) {
    return (
      <Button variant="outline" size="sm" disabled title="Add your liability waiver in Settings first">
        <Send className="size-4 mr-1.5" />
        Waiver needed
      </Button>
    );
  }

  // ...rest unchanged
}
```

- [ ] **Step 6.5: Pass `hasWaiver` from the client detail page**

Open `app/(coach)/clients/[id]/page.tsx`. Find the `<InviteClientButton ... />` JSX and the surrounding data fetch. Add a query for the coach's `waiverText`:

```typescript
const coach = await db.user.findUnique({
  where: { id: session.user.id }, // or however coachId is sourced in this file
  select: { waiverText: true },
});
```

If the page already loads the coach, just extend its select to include `waiverText: true`. Then pass `hasWaiver={!!coach?.waiverText}` to `<InviteClientButton ... />`.

- [ ] **Step 6.6: Server-side guard in `lib/actions/invites.ts`**

In `inviteClient` (around line 30), after fetching the coach (line 30-33), also check `waiverText`:

```typescript
const coach = await db.user.findUnique({
  where: { id: coachId },
  select: { name: true, waiverText: true },
});

if (!coach?.waiverText) {
  throw new Error("Add your liability waiver in Settings before inviting clients");
}
```

- [ ] **Step 6.7: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 6.8: Manual smoke test**

Run: `npm run dev`. As a coach with no waiver yet:
- Dashboard checklist shows "Add your liability waiver" item.
- Invite button on a client page shows "Waiver needed" disabled state.
After saving a waiver: checklist item ticks off, invite button enables.

- [ ] **Step 6.9: Commit**

```bash
git add lib/actions/coach-profile.ts app/\(coach\)/setup-checklist.tsx app/\(coach\)/page.tsx components/invite-client-button.tsx lib/actions/invites.ts app/\(coach\)/clients/\[id\]/page.tsx
git commit -m "feat(intake): gate client invites on coach having a waiver; checklist item"
```

---

## Task 7: Welcome wizard cleanup

**Files:**
- Modify: `app/welcome/welcome-wizard.tsx`
- Modify: `app/welcome/page.tsx`
- Modify: `lib/validations/coach-profile.ts`

- [ ] **Step 7.1: Update `lib/validations/coach-profile.ts`**

Remove `intakeSlug` from `updateCoachProfileSchema`. Keep `SLUG_PATTERN` export for now (still imported by `coach-profile.ts` action; will be removed in follow-up).

```typescript
import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

const optionalNullableString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .nullable()
    .optional()
    .transform((s) => (s == null || s === "" ? null : s));

export const updateCoachProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80).optional(),
  businessName: optionalNullableString(80),
  specialty: optionalNullableString(80),
  bio: optionalNullableString(240),
  timezone: optionalNullableString(80),
});

export type UpdateCoachProfileInput = z.infer<typeof updateCoachProfileSchema>;
export { SLUG_PATTERN };
```

Also remove the `if (parsed.data.intakeSlug) { ... }` block in `lib/actions/coach-profile.ts` `updateCoachProfile` (around line 99-107) — that block becomes dead since the field is no longer in the input.

- [ ] **Step 7.2: Update `app/welcome/welcome-wizard.tsx` — drop the slug step**

The wizard becomes 2 steps instead of 3:
- Step 1: name / business / specialty / bio (unchanged)
- Step 2: timezone (the slug input + slug status check are deleted)
- Final completion screen: replace the "Your intake link" card with a "Next: add your liability waiver" card.

Specifically:

1. Drop the `initialSlug` prop and all `slug`, `slugStatus`, `setSlug`, `setSlugStatus`, and the `useEffect` that calls `checkSlugAvailable` (around lines 56-90).
2. Drop the `step2Valid = slug && timezone && slugStatus.state === "ok"` line. Replace with `step2Valid = !!timezone && timezone.trim().length > 0`.
3. In `next()` (around line 102): change the error message for step 2 from "Please choose a valid intake URL and timezone." to "Please set your timezone.".
4. In `finish()` (around line 116-123): remove `intakeSlug: slug` from the `completeOnboarding` call. Keep everything else.
5. In the step header (around line 142): change `Step {step} of 3` to `Step {step} of 2`. Change `(step / 3) * 100` to `(step / 2) * 100`.
6. Replace the step-3 JSX block (around lines 294-330) and renumber: the existing step-2 (slug + timezone) block becomes step-2 (timezone only); the existing step-3 (completion) JSX becomes... wait, we want the completion screen to appear after step 2 now. Restructure so `step < 2 ? "Continue" : "Go to dashboard"`. The completion screen is gone — `finish()` redirects straight to `/settings#waiver` or just `/`.

Actually, simpler restructure: keep the 3-step wizard structure (intro / details / done) but step 2 (formerly with slug) is just timezone, and step 3 (completion) replaces the intake-link card with a waiver call-to-action.

```typescript
// Step 2 simplified:
{step === 2 && (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        Set up your practice
      </h1>
      <p className="text-muted-foreground">
        Your timezone keeps schedules accurate. You can change it later.
      </p>
    </div>
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone <span className="text-destructive">*</span></Label>
        <Input
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="America/Denver"
        />
        <p className="text-xs text-muted-foreground">
          Auto-detected from your browser. Edit if needed.
        </p>
      </div>
    </div>
  </div>
)}
```

And step 3 (completion) replaces the intake-link card:

```typescript
{step === 3 && (
  <div className="space-y-8">
    <div className="flex items-start gap-4">
      <div className="size-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <Check className="size-5 text-primary" strokeWidth={3} />
      </div>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          You&apos;re all set, {name.split(" ")[0] || "Coach"}
        </h1>
        <p className="text-muted-foreground">
          One more thing before you invite clients — add your liability waiver.
        </p>
      </div>
    </div>
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <h3 className="font-medium text-sm">Next: liability waiver</h3>
      <p className="text-sm text-muted-foreground">
        Every client signs your waiver before their first workout. Add it now in Settings — without it, you won&apos;t be able to invite clients.
      </p>
    </div>
    <div className="rounded-lg border bg-muted/40 p-5 space-y-3">
      <h3 className="font-medium text-sm">What&apos;s next</h3>
      <ul className="text-sm text-muted-foreground space-y-2">
        <li className="flex gap-2"><span className="text-primary">→</span> Add your liability waiver in Settings</li>
        <li className="flex gap-2"><span className="text-primary">→</span> Add your first client and send them an invite</li>
        <li className="flex gap-2"><span className="text-primary">→</span> Build a program and assign it</li>
      </ul>
    </div>
  </div>
)}
```

Also delete the `SlugCopyRow` function and `Globe`, `Copy` imports if no longer used. Delete the `Loader2`, `AlertCircle` only if no longer used elsewhere — keep them if still referenced.

- [ ] **Step 7.3: Update `app/welcome/page.tsx`**

Drop the `intakeSlug` and `initialSlug` references. Read the file and remove all slug-related code from the page server component (the DB read and the prop passed to `<WelcomeWizard ... />`).

- [ ] **Step 7.4: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 7.5: Manual smoke test**

Log out, sign up as a new coach. Verify:
- Welcome wizard has 2 steps now (or 3 with no slug input on step 2).
- Step header reads "Step N of 3" (or "Step N of 2" if you went that route — stay consistent).
- Completion screen shows the "Next: liability waiver" message, not the intake URL.
- "Go to dashboard" lands you on `/` and the checklist includes the waiver item.

- [ ] **Step 7.6: Commit**

```bash
git add app/welcome/ lib/validations/coach-profile.ts lib/actions/coach-profile.ts
git commit -m "feat(intake): remove public intake URL from welcome wizard; replace with waiver CTA"
```

---

## Task 8: Client onboarding intake form

**Files:**
- Create: `app/onboarding/layout.tsx`
- Create: `app/onboarding/intake/page.tsx`
- Create: `app/onboarding/intake/intake-form.tsx`
- Modify: `app/(client)/layout.tsx`

- [ ] **Step 8.1: Create `app/onboarding/layout.tsx`**

Minimal layout — auth check + bare container, **no `requireClient()`** because we want this route to handle gating on its own. Also no client nav.

```typescript
import { Compass } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Praevio</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10">{children}</main>
    </>
  );
}
```

- [ ] **Step 8.2: Create `app/onboarding/intake/page.tsx`**

Server component shell. Calls `requireClient` and `getIntakeBundle`. If already submitted, redirects to `/dashboard`.

```typescript
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth-utils";
import { getIntakeBundle } from "@/lib/actions/intake";
import { IntakeForm } from "./intake-form";

export default async function IntakeOnboardingPage() {
  await requireClient();
  const bundle = await getIntakeBundle();

  if (bundle.alreadySubmitted) {
    redirect("/dashboard");
  }

  return (
    <IntakeForm
      coachName={bundle.coachName}
      waiverText={bundle.waiverText}
      questions={bundle.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        required: q.required,
      }))}
    />
  );
}
```

- [ ] **Step 8.3: Create `app/onboarding/intake/intake-form.tsx`**

Single-page form with all sections. Use existing UI primitives. The form posts to `submitIntake` server action.

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { submitIntake } from "@/lib/actions/intake";

type QuestionType = "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTI_CHOICE";
type Question = { id: string; text: string; type: QuestionType; options: string[]; required: boolean };

const MEDICAL_CONDITIONS = [
  "Hypertension", "Type 1 diabetes", "Type 2 diabetes", "Heart disease",
  "Asthma / COPD", "Osteoporosis", "Arthritis", "Thyroid disorder",
  "PCOS", "Anxiety / depression", "Autoimmune disorder", "Cancer history",
  "Diastasis recti", "Herniated disc", "None of the above",
];

const PAIN_AREAS = [
  "Neck / cervical", "Shoulder (left)", "Shoulder (right)", "Upper back",
  "Lower back / lumbar", "Hip (left)", "Hip (right)", "Knee (left)",
  "Knee (right)", "Ankle / foot", "Elbow", "Wrist", "Other",
];

const PREGNANCY_OPTIONS = ["No", "Currently pregnant", "Postpartum <12mo", "N/A"];
const SIDE_OPTIONS = ["Left", "Right", "Both", "N/A"] as const;

type Injury = { description: string; year: string; side: typeof SIDE_OPTIONS[number]; active: boolean };

export function IntakeForm({
  coachName,
  waiverText,
  questions,
}: {
  coachName: string;
  waiverText: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Personal
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [occupation, setOccupation] = useState("");

  // Medical
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionsOther, setConditionsOther] = useState("");
  const [meds, setMeds] = useState<"No" | "Yes" | "">("");
  const [medsList, setMedsList] = useState("");
  const [pregnancy, setPregnancy] = useState("");
  const [hasRestriction, setHasRestriction] = useState<"No" | "Yes" | "">("");
  const [restrictionDetail, setRestrictionDetail] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [physicianPhone, setPhysicianPhone] = useState("");

  const [hasSurgery, setHasSurgery] = useState<"No" | "Yes" | "">("");
  const [injuries, setInjuries] = useState<Injury[]>([]);

  const [hasChronicPain, setHasChronicPain] = useState<"No" | "Yes" | "">("");
  const [painDetail, setPainDetail] = useState("");
  const [painAreas, setPainAreas] = useState<string[]>([]);

  // Custom answers
  const [customAnswers, setCustomAnswers] = useState<Record<string, { textValue: string; choiceValues: string[] }>>(
    Object.fromEntries(questions.map((q) => [q.id, { textValue: "", choiceValues: [] }])),
  );

  // Signature
  const [agreeWaiver, setAgreeWaiver] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  function toggle(list: string[], v: string, set: (s: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function setCustomText(id: string, value: string) {
    setCustomAnswers({ ...customAnswers, [id]: { ...customAnswers[id], textValue: value } });
  }
  function setCustomChoice(id: string, value: string, multi: boolean) {
    const current = customAnswers[id].choiceValues;
    const next = multi
      ? (current.includes(value) ? current.filter((x) => x !== value) : [...current, value])
      : [value];
    setCustomAnswers({ ...customAnswers, [id]: { ...customAnswers[id], choiceValues: next } });
  }

  function handleSubmit() {
    setError(null);

    if (!agreeWaiver) {
      setError("Please agree to the waiver to continue.");
      return;
    }
    if (signatureName.trim().length < 2) {
      setError("Please type your full legal name.");
      return;
    }

    const payload = {
      dateOfBirth: dateOfBirth || undefined,
      sex: sex || null,
      heightInches: heightInches ? Number(heightInches) : null,
      weightLbs: weightLbs ? Number(weightLbs) : null,
      occupation: occupation || null,
      medicalConditions: conditions,
      conditionsOther: conditionsOther || null,
      medications: meds === "Yes" ? medsList : null,
      pregnancyStatus: pregnancy || null,
      physicianRestrictions: hasRestriction === "Yes" ? restrictionDetail : null,
      physicianName: physicianName || null,
      physicianPhone: physicianPhone || null,
      injuries: hasSurgery === "Yes"
        ? injuries.map((i) => ({
            description: i.description,
            year: Number(i.year),
            side: i.side,
            active: i.active,
          }))
        : [],
      chronicPain: hasChronicPain === "Yes" ? painDetail : null,
      painAreas: hasChronicPain === "Yes" ? painAreas : [],
      customAnswers: Object.entries(customAnswers).map(([questionId, a]) => ({
        questionId,
        textValue: a.textValue || undefined,
        choiceValues: a.choiceValues,
      })),
      agreeWaiver: true as const,
      signatureName: signatureName.trim(),
    };

    startTransition(async () => {
      const result = await submitIntake(payload);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome — let&apos;s get you set up</h1>
        <p className="text-sm text-muted-foreground">
          {coachName} needs a few details before your first workout. This takes about 5 minutes.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Section title="Personal">
        <Grid2>
          <Field label="Date of birth">
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </Field>
          <Field label="Sex assigned at birth">
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Height (inches)">
            <Input type="number" min="12" max="120" value={heightInches} onChange={(e) => setHeightInches(e.target.value)} />
          </Field>
          <Field label="Weight (lbs)">
            <Input type="number" min="30" max="1500" step="0.1" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} />
          </Field>
          <Field label="Occupation">
            <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g., nurse, office worker" />
          </Field>
        </Grid2>
      </Section>

      <Section title="Medical history">
        <Field label="Current or past medical conditions (select all that apply)">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MEDICAL_CONDITIONS.map((c) => (
              <CheckOption key={c} checked={conditions.includes(c)} onChange={() => toggle(conditions, c, setConditions)}>{c}</CheckOption>
            ))}
          </div>
        </Field>
        <Field label="Other conditions not listed above">
          <Input value={conditionsOther} onChange={(e) => setConditionsOther(e.target.value)} placeholder="Describe if applicable" maxLength={500} />
        </Field>
      </Section>

      <Section title="Medications">
        <Field label="Are you currently taking medications that may affect exercise?">
          <RadioRow options={["No", "Yes"]} value={meds} onChange={(v) => setMeds(v as "No" | "Yes")} />
          {meds === "Yes" && (
            <Textarea
              className="mt-3"
              value={medsList}
              onChange={(e) => setMedsList(e.target.value)}
              placeholder="Medication name, dosage..."
              maxLength={2000}
            />
          )}
        </Field>
      </Section>

      <Section title="Pregnancy / postpartum">
        <RadioRow options={PREGNANCY_OPTIONS} value={pregnancy} onChange={setPregnancy} />
      </Section>

      <Section title="Physician restrictions">
        <Field label="Has your doctor placed any exercise restrictions?">
          <RadioRow options={["No", "Yes"]} value={hasRestriction} onChange={(v) => setHasRestriction(v as "No" | "Yes")} />
          {hasRestriction === "Yes" && (
            <Textarea
              className="mt-3"
              value={restrictionDetail}
              onChange={(e) => setRestrictionDetail(e.target.value)}
              placeholder="Describe any restrictions..."
              maxLength={2000}
            />
          )}
        </Field>
        <Grid2>
          <Field label="Physician / provider name">
            <Input value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} />
          </Field>
          <Field label="Provider phone / clinic">
            <Input value={physicianPhone} onChange={(e) => setPhysicianPhone(e.target.value)} placeholder="(555) 000-0000" />
          </Field>
        </Grid2>
      </Section>

      <Section title="Surgeries / injuries">
        <Field label="Do you have any significant surgeries or injuries to disclose?">
          <RadioRow options={["No", "Yes"]} value={hasSurgery} onChange={(v) => setHasSurgery(v as "No" | "Yes")} />
        </Field>
        {hasSurgery === "Yes" && (
          <div className="space-y-3 rounded-md border p-3">
            {injuries.map((inj, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_80px_100px_100px_32px] sm:items-end">
                <Field label="Description">
                  <Input
                    value={inj.description}
                    onChange={(e) => setInjuries(injuries.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                    placeholder="e.g., ACL reconstruction"
                    maxLength={200}
                  />
                </Field>
                <Field label="Year">
                  <Input type="number" min="1900" max={new Date().getFullYear() + 1} value={inj.year} onChange={(e) => setInjuries(injuries.map((x, j) => j === i ? { ...x, year: e.target.value } : x))} />
                </Field>
                <Field label="Side">
                  <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={inj.side} onChange={(e) => setInjuries(injuries.map((x, j) => j === i ? { ...x, side: e.target.value as Injury["side"] } : x))}>
                    {SIDE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Active?">
                  <CheckOption
                    checked={inj.active}
                    onChange={() => setInjuries(injuries.map((x, j) => j === i ? { ...x, active: !x.active } : x))}
                  >Yes</CheckOption>
                </Field>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setInjuries(injuries.filter((_, j) => j !== i))} aria-label="Remove row">
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInjuries([...injuries, { description: "", year: String(new Date().getFullYear()), side: "N/A", active: false }])}
            >
              <Plus className="size-4 mr-1.5" /> Add injury / surgery
            </Button>
          </div>
        )}
      </Section>

      <Section title="Chronic pain">
        <Field label="Do you experience any chronic pain?">
          <RadioRow options={["No", "Yes"]} value={hasChronicPain} onChange={(v) => setHasChronicPain(v as "No" | "Yes")} />
        </Field>
        {hasChronicPain === "Yes" && (
          <>
            <Field label="Areas of pain, discomfort, or restriction (select all that apply)">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAIN_AREAS.map((a) => (
                  <CheckOption key={a} checked={painAreas.includes(a)} onChange={() => toggle(painAreas, a, setPainAreas)}>{a}</CheckOption>
                ))}
              </div>
            </Field>
            <Field label="Describe location, severity (1-10), duration">
              <Textarea value={painDetail} onChange={(e) => setPainDetail(e.target.value)} maxLength={2000} />
            </Field>
          </>
        )}
      </Section>

      {questions.length > 0 && (
        <Section title={`${coachName}'s questions`}>
          {questions.map((q) => (
            <Field key={q.id} label={q.required ? `${q.text} *` : q.text}>
              {q.type === "SHORT_TEXT" && (
                <Input
                  value={customAnswers[q.id].textValue}
                  onChange={(e) => setCustomText(q.id, e.target.value)}
                  maxLength={500}
                />
              )}
              {q.type === "LONG_TEXT" && (
                <Textarea
                  value={customAnswers[q.id].textValue}
                  onChange={(e) => setCustomText(q.id, e.target.value)}
                  maxLength={5000}
                  rows={4}
                />
              )}
              {q.type === "SINGLE_CHOICE" && (
                <RadioRow
                  options={q.options}
                  value={customAnswers[q.id].choiceValues[0] ?? ""}
                  onChange={(v) => setCustomChoice(q.id, v, false)}
                />
              )}
              {q.type === "MULTI_CHOICE" && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {q.options.map((opt) => (
                    <CheckOption
                      key={opt}
                      checked={customAnswers[q.id].choiceValues.includes(opt)}
                      onChange={() => setCustomChoice(q.id, opt, true)}
                    >
                      {opt}
                    </CheckOption>
                  ))}
                </div>
              )}
            </Field>
          ))}
        </Section>
      )}

      <Section title="Waiver & signature">
        <div className="rounded-md border bg-muted/30 p-4 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm">
          {waiverText}
        </div>
        <Field label="">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox checked={agreeWaiver} onCheckedChange={(v) => setAgreeWaiver(v === true)} />
            <span>I have read and agree to the waiver above. I confirm the information I provided is accurate to the best of my knowledge.</span>
          </label>
        </Field>
        <Field label="Type your full legal name *">
          <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} maxLength={120} autoComplete="name" />
        </Field>
      </Section>

      <div className="flex justify-end pt-4 border-t">
        <Button type="button" onClick={handleSubmit} disabled={pending || !agreeWaiver || signatureName.trim().length < 2}>
          {pending ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Submitting...</> : "Sign & Submit"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function CheckOption({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/30">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

function RadioRow({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
            value === opt ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/30"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
```

If `components/ui/checkbox.tsx` does not exist in the repo, replace `<Checkbox>` usage with a native `<input type="checkbox" checked={...} onChange={...} />`. Verify by running `ls components/ui/checkbox.tsx` before proceeding — if it's missing, swap to native input.

- [ ] **Step 8.4: Add the intake gate to `app/(client)/layout.tsx`**

Modify the file:

```typescript
import { Compass } from "lucide-react";
import { redirect } from "next/navigation";
import { ClientNav } from "@/components/client-nav";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireClient } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireClient();

  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    select: { intakeResponse: { select: { id: true } } },
  });

  if (!client?.intakeResponse) {
    redirect("/onboarding/intake");
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Praevio</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <ClientNav />
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
```

- [ ] **Step 8.5: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 8.6: Manual smoke test**

In a clean DB or after running `npm run db:seed` if a seed exists for test users:
1. Log in as a coach. Set a waiver. Add a couple of custom questions (one required text, one optional radio).
2. Add a client with an email, send them an invite.
3. Open the invite link in an incognito window. Set a password. Land on /dashboard.
4. Expected: redirected to `/onboarding/intake`. The form shows all sections, the coach's waiver text, and the custom questions.
5. Fill it out, sign, submit.
6. Expected: redirect to /dashboard, no more intake gate, all client portal functions work normally.

- [ ] **Step 8.7: Commit**

```bash
git add app/onboarding/ app/\(client\)/layout.tsx
git commit -m "feat(intake): client onboarding form with waiver signature and custom-question support"
```

---

## Task 9: Coach review — Intake tab

**Files:**
- Create: `app/(coach)/clients/[id]/intake-tab.tsx`
- Create: `app/(coach)/clients/[id]/request-retake-button.tsx`
- Modify: `app/(coach)/clients/[id]/page.tsx`
- Modify: `app/(coach)/clients/[id]/client-tabs.tsx`

- [ ] **Step 9.1: Create `app/(coach)/clients/[id]/request-retake-button.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { requestIntakeRetake } from "@/lib/actions/intake";

export function RequestRetakeButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("This will permanently delete the client's current intake response. They'll be prompted to refill it on next login. Continue?")) return;
    setError(null);
    startTransition(async () => {
      const result = await requestIntakeRetake(clientId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <RotateCcw className="size-4 mr-1.5" />}
        Request re-take
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 9.2: Create `app/(coach)/clients/[id]/intake-tab.tsx`**

Pure render component (server component fine). Takes the response prop and renders read-only.

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { RequestRetakeButton } from "./request-retake-button";

type Injury = { description: string; year: number; side: string; active: boolean };

type IntakeResponseData = {
  id: string;
  dateOfBirth: Date | null;
  sex: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  occupation: string | null;
  medicalConditions: string[];
  conditionsOther: string | null;
  medications: string | null;
  pregnancyStatus: string | null;
  physicianRestrictions: string | null;
  physicianName: string | null;
  physicianPhone: string | null;
  injuries: unknown;
  chronicPain: string | null;
  painAreas: string[];
  waiverTextSnapshot: string;
  signatureName: string;
  signatureIp: string;
  signatureUserAgent: string;
  signedAt: Date;
  answers: {
    id: string;
    questionTextSnapshot: string;
    questionTypeSnapshot: string;
    textValue: string | null;
    choiceValues: string[];
  }[];
};

export function IntakeTab({ clientId, response }: { clientId: string; response: IntakeResponseData | null }) {
  if (!response) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Intake pending — the client will complete this on first login.
        </CardContent>
      </Card>
    );
  }

  const injuries = Array.isArray(response.injuries) ? (response.injuries as Injury[]) : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" /> Signed waiver
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Signed by <strong>{response.signatureName}</strong> on {new Date(response.signedAt).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                IP {response.signatureIp}
              </p>
            </div>
            <Badge variant="secondary">Locked</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">View signed waiver text</summary>
            <div className="mt-3 rounded-md border bg-muted/30 p-3 whitespace-pre-wrap text-xs max-h-72 overflow-y-auto">
              {response.waiverTextSnapshot}
            </div>
          </details>
        </CardContent>
      </Card>

      <Section title="Personal">
        <KV label="Date of birth" value={response.dateOfBirth ? new Date(response.dateOfBirth).toLocaleDateString() : null} />
        <KV label="Sex" value={response.sex} />
        <KV label="Height" value={response.heightInches ? `${response.heightInches} in` : null} />
        <KV label="Weight" value={response.weightLbs ? `${response.weightLbs} lbs` : null} />
        <KV label="Occupation" value={response.occupation} />
      </Section>

      <Section title="Medical">
        <KV label="Conditions" value={response.medicalConditions.length > 0 ? response.medicalConditions.join(", ") : null} />
        <KV label="Other conditions" value={response.conditionsOther} />
        <KV label="Medications" value={response.medications} multiline />
        <KV label="Pregnancy / postpartum" value={response.pregnancyStatus} />
      </Section>

      <Section title="Physician restrictions">
        <KV label="Restrictions" value={response.physicianRestrictions} multiline />
        <KV label="Physician name" value={response.physicianName} />
        <KV label="Physician phone" value={response.physicianPhone} />
      </Section>

      <Section title="Injuries / surgeries">
        {injuries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">None reported.</p>
        ) : (
          <ul className="space-y-2">
            {injuries.map((inj, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{inj.description}</span> · {inj.year} · {inj.side} · {inj.active ? "Active" : "Resolved"}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Chronic pain">
        <KV label="Areas" value={response.painAreas.length > 0 ? response.painAreas.join(", ") : null} />
        <KV label="Detail" value={response.chronicPain} multiline />
      </Section>

      {response.answers.length > 0 && (
        <Section title="Additional questions">
          {response.answers.map((a) => (
            <KV
              key={a.id}
              label={a.questionTextSnapshot}
              value={a.choiceValues.length > 0 ? a.choiceValues.join(", ") : a.textValue}
              multiline
            />
          ))}
        </Section>
      )}

      <div className="pt-2">
        <RequestRetakeButton clientId={clientId} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function KV({ label, value, multiline }: { label: string; value: string | null | undefined; multiline?: boolean }) {
  return (
    <div className={multiline ? "" : "flex gap-3 text-sm"}>
      <p className="text-xs text-muted-foreground font-medium shrink-0 min-w-32">{label}</p>
      {value
        ? <p className={`text-sm ${multiline ? "mt-0.5 whitespace-pre-wrap" : ""}`}>{value}</p>
        : <p className="text-sm text-muted-foreground italic">Not provided</p>}
    </div>
  );
}
```

- [ ] **Step 9.3: Pass intake response to client-tabs from the page**

Open `app/(coach)/clients/[id]/page.tsx`. Find the data-fetching block. Add a call to `getClientIntakeForCoach`:

```typescript
import { getClientIntakeForCoach } from "@/lib/actions/intake";
// ...
const intakeResponse = await getClientIntakeForCoach(id);
```

Pass it to `<ClientTabs ... intakeResponse={intakeResponse} ... />`.

- [ ] **Step 9.4: Add the Intake tab to `app/(coach)/clients/[id]/client-tabs.tsx`**

Add the prop, the trigger, and the content:

1. Extend the props type to include `intakeResponse` (use the `IntakeResponseData` shape, or import that type from `intake-tab.tsx`).
2. Import `IntakeTab` at the top of the file: `import { IntakeTab } from "./intake-tab";`
3. In the `<TabsList>` block (around line 128-134), add a new trigger after "Notes" (or wherever makes sense):
   ```tsx
   <TabsTrigger value="intake">Intake</TabsTrigger>
   ```
4. Add a new `<TabsContent value="intake" className="mt-4"><IntakeTab clientId={client.id} response={intakeResponse} /></TabsContent>` after the existing TabsContent blocks.

- [ ] **Step 9.5: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 9.6: Manual smoke test**

As a coach, open a client who has submitted intake → "Intake" tab shows full response. Hit "Request re-take" → confirms → response gone, badge flips to "pending."

Log in as that client → redirected to `/onboarding/intake` → resubmit → back to dashboard.

- [ ] **Step 9.7: Commit**

```bash
git add app/\(coach\)/clients/\[id\]/intake-tab.tsx app/\(coach\)/clients/\[id\]/request-retake-button.tsx app/\(coach\)/clients/\[id\]/page.tsx app/\(coach\)/clients/\[id\]/client-tabs.tsx
git commit -m "feat(intake): coach client-detail Intake tab + Request re-take action"
```

---

## Task 10: Admin view cleanup

**Files:**
- Modify: `app/admin/coaches/[id]/page.tsx`
- Modify: `app/admin/coaches/page.tsx`
- Modify: `lib/actions/admin.ts`

- [ ] **Step 10.1: `app/admin/coaches/[id]/page.tsx`**

Open the file, find any reference to `intakeSlug` (display row, badge, label). Replace it with a "Waiver" row that shows "Set" or "Missing" based on whether `coach.waiverText` is non-empty:

```typescript
// In the data fetch:
const coach = await ... select: { /* existing */, waiverText: true }
// In the JSX:
<Row label="Waiver">
  {coach.waiverText
    ? <Badge variant="secondary">Set</Badge>
    : <Badge variant="outline" className="border-warning/50 text-warning">Missing</Badge>}
</Row>
```

- [ ] **Step 10.2: `app/admin/coaches/page.tsx`**

Similar. Replace any `intakeSlug` column with a "Waiver" column showing the same Set/Missing indicator. Adjust the table header and row accordingly.

- [ ] **Step 10.3: `lib/actions/admin.ts` — CSV export (around line 605-614)**

Locate the `exportCoachesCsv` function. Update the column list:
- Remove `intakeSlug` from the `select` statement (around line 605).
- Add `waiverText: true` to the `select`.
- In the header row (around line 611), replace `"intakeSlug"` with `"hasWaiver"`.
- In the row mapping (around line 612-614), replace `c.intakeSlug ?? ""` with `c.waiverText ? "true" : "false"`.

Also update the select in any other admin function that reads `intakeSlug` — search for `intakeSlug:` in `lib/actions/admin.ts` and remove all occurrences (with `Grep`).

- [ ] **Step 10.4: Verify lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 10.5: Manual smoke test**

Log in as an admin. Visit `/admin/coaches` and `/admin/coaches/<id>`. Verify:
- No "intake URL" / `intakeSlug` references appear anywhere.
- A "Waiver" Set/Missing indicator appears on the coach detail page.

- [ ] **Step 10.6: Commit**

```bash
git add app/admin/coaches/ lib/actions/admin.ts
git commit -m "feat(intake): admin views show waiver-set indicator instead of orphaned intake slug"
```

---

## Task 11: Final verification

- [ ] **Step 11.1: Full lint + build pass**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 11.2: End-to-end smoke test in dev**

Walk the full happy path:
1. Sign up as a new coach → 2-step welcome wizard → land on dashboard with checklist showing "Add your liability waiver."
2. Go to Settings → add a waiver → checklist updates.
3. Add a custom question (required radio).
4. Add a client with email → invite button works → invite email sent (or check terminal log if email is mocked).
5. Open the invite link (incognito) → set password → land on `/onboarding/intake`.
6. Fill out form → sign → land on `/dashboard`.
7. Try to navigate to `/dashboard` directly after submitting → no redirect, normal access.
8. As coach: open the client's Intake tab → see signed response with snapshot waiver, name, IP, date, all sections, custom answer.
9. Hit "Request re-take" → confirms → response disappears.
10. As client (refresh page): redirected back to `/onboarding/intake`.

- [ ] **Step 11.3: Push and open PR**

```bash
git push -u origin <branch-name>
gh pr create --title "feat(intake): client intake form with waiver signature" --body "$(cat <<'EOF'
## Summary
- Adds a required health/medical intake form with a coach-supplied liability waiver that every client must complete on first login before accessing the dashboard.
- Coach configures waiver text + custom add-on questions in Settings → Intake.
- Client is gated by `app/(client)/layout.tsx` (server component, not Edge middleware).
- Coach reviews signed intake on a new "Intake" tab on the client detail page; can request a re-take.
- Drops the orphaned public-intake-URL promise from the welcome wizard (the `intakeSlug` column stays for now, dropped in a follow-up).
- Piggy-backs the `acceptInvite` bug fix from earlier this session: existing-user branch now sets `emailVerified` and updates password.

Spec: `docs/superpowers/specs/2026-05-17-client-intake-form-design.md`
Plan: `docs/superpowers/plans/2026-05-17-client-intake-form.md`

## Test plan
- [ ] New coach: 2-step welcome wizard, checklist shows "Add waiver"
- [ ] Coach: Settings → Intake — waiver save, question CRUD, reorder, archive
- [ ] Invite button disabled when no waiver; enabled after waiver saved
- [ ] Client invite → set password → redirected to /onboarding/intake
- [ ] Intake form submit → redirected to /dashboard
- [ ] Coach: client detail → Intake tab shows signed response
- [ ] Re-take: coach clears → client gated again
- [ ] Admin: coaches list + detail show "Waiver set/missing" instead of slug
EOF
)"
```

---

## Self-review

**Spec coverage:**
- ✅ Data model (Task 1 — schema)
- ✅ Coach waiver text + question CRUD (Tasks 3, 5)
- ✅ Setup-checklist gating + invite gating (Task 6)
- ✅ Welcome wizard cleanup (Task 7)
- ✅ Client onboarding form (Task 4 server action + Task 8 UI + layout gate)
- ✅ Coach client-detail Intake tab + re-take (Task 9)
- ✅ Admin view cleanup (Task 10)
- ✅ HIPAA non-goal — no privacy work needed, called out in plan via reference to spec
- ✅ Hard-cutover rollout — no migration code needed; covered implicitly by the layout-gate behavior
- ✅ `Client.healthConditions` / `Client.gender` / `Client.goals` untouched — explicitly noted in file map

**Placeholder scan:** no "TBD" / "TODO" / "implement later" — every step contains code or exact commands.

**Type consistency:** `Question` shape is the same in `intake-section.tsx` and `intake-form.tsx`. `IntakeResponseData` is defined in `intake-tab.tsx` and matches the Prisma return shape from `getClientIntakeForCoach`. `IntakeQuestionType` enum values (`SHORT_TEXT | LONG_TEXT | SINGLE_CHOICE | MULTI_CHOICE`) used consistently across schema, validation, server actions, and UI.

**Known minor handwaves the executing agent should resolve at task time:**
- Step 6.5 says "however coachId is sourced in this file" — agent must read the file and adapt. The exact source is `requireCoach()` returning a session.
- Step 5.3 says to update `coach-profile-section.tsx` to "drop the intakeSlug prop and field" — agent reads the file and removes those specific lines.
- Step 10.1/10.2/10.3 admin views — agent greps for `intakeSlug` and replaces each occurrence per the described pattern.
- Step 8.3 mentions a `Checkbox` component — agent checks if `components/ui/checkbox.tsx` exists; if not, swaps to native `<input type="checkbox">`.
