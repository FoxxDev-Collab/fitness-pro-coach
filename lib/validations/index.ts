import { z } from "zod";

/**
 * Parses a FormData against a zod schema. Returns either a typed value or a
 * single user-friendly error string (the first issue's message).
 */
export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const obj: Record<string, FormDataEntryValue | null> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  const result = schema.safeParse(obj);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first?.message || "Invalid input" };
  }
  return { ok: true, data: result.data };
}

/**
 * Parses an arbitrary input object against a zod schema.
 */
export function parseInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first?.message || "Invalid input" };
  }
  return { ok: true, data: result.data };
}

/** A cuid-shaped id (Prisma's @default(cuid())). */
export const cuid = z
  .string()
  .min(20, "Invalid id")
  .max(40, "Invalid id")
  .regex(/^[a-z0-9]+$/, "Invalid id");

/** Permissive optional string that becomes null when blank/missing. */
export const optionalText = (max = 5000) =>
  z
    .string()
    .max(max)
    .transform((s) => (s.trim() === "" ? null : s.trim()))
    .nullable()
    .optional();

/** Required short text. */
export const shortText = (max = 200) => z.string().trim().min(1).max(max);

/** Coerces a FormData string into a non-negative integer. */
export const nonNegativeInt = z.coerce.number().int().min(0).max(1_000_000);

/** Coerces to a non-negative float (e.g., weight, distance). */
export const nonNegativeFloat = z.coerce.number().min(0).max(100_000);
