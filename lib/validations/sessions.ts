import { z } from "zod";
import { cuid } from "./index";

const optionalNumber = (max: number) =>
  z.number().min(0).max(max).optional().nullable();

const sessionSetSchema = z.object({
  setNumber: z.number().int().min(0).max(1000),
  reps: optionalNumber(10_000),
  weight: optionalNumber(100_000),
  duration: optionalNumber(100_000),
  distance: optionalNumber(100_000),
});

const sessionExerciseSchema = z.object({
  exerciseIndex: z.number().int().min(0).max(1000),
  sets: optionalNumber(1000),
  reps: optionalNumber(10_000),
  weight: optionalNumber(100_000),
  duration: optionalNumber(100_000),
  distance: optionalNumber(100_000),
  notes: z
    .string()
    .max(5000)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal("").transform(() => undefined)),
  setDetails: z.array(sessionSetSchema).max(200),
});

export const saveSessionSchema = z.object({
  assignmentId: cuid,
  workoutIndex: z.number().int().min(0).max(1000),
  sessionNotes: z
    .string()
    .max(5000)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal("").transform(() => undefined)),
  duration: z.number().min(0).max(86_400).optional().nullable(),
  date: z.coerce.date(),
  exercises: z.array(sessionExerciseSchema).max(100),
});

export const updateSessionSchema = z.object({
  sessionNotes: z
    .string()
    .max(5000)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal("").transform(() => undefined)),
  date: z.coerce.date().optional(),
  exercises: z.array(sessionExerciseSchema).max(100),
});

export type SaveSessionInput = z.infer<typeof saveSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
