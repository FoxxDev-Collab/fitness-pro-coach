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
  intakeSlug: z
    .union([
      z.string().trim().toLowerCase().regex(SLUG_PATTERN, "Use 3-40 letters, numbers, or hyphens"),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((v) => (v == null || v === "" ? null : v)),
});

export type UpdateCoachProfileInput = z.infer<typeof updateCoachProfileSchema>;
export { SLUG_PATTERN };
