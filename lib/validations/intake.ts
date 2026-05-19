import { z } from "zod";

// ─── Shared helpers ──────────────────────────────────────

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
