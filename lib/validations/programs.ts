import { z } from "zod";
import { cuid } from "./index";

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal("").transform(() => undefined));

const workoutExerciseSchema = z.object({
  exerciseId: cuid,
  order: z.number().int().min(0).max(1000),
  sets: z.number().int().min(0).max(1000),
  reps: z.number().int().min(0).max(10_000),
  weight: z.number().min(0).max(100_000),
  duration: z.number().min(0).max(100_000),
  distance: z.number().min(0).max(100_000),
  rest: z.number().int().min(0).max(86_400),
  notes: optionalString(2000),
});

const workoutSchema = z.object({
  name: z.string().trim().min(1, "Workout name is required").max(100),
  order: z.number().int().min(0).max(1000),
  exercises: z.array(workoutExerciseSchema).max(100),
});

export const createProgramSchema = z.object({
  name: z.string().trim().min(1, "Program name is required").max(100),
  description: optionalString(2000),
  workouts: z.array(workoutSchema).max(50),
});

export const updateProgramSchema = createProgramSchema;

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;
