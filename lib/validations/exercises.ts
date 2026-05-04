import { z } from "zod";

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal("").transform(() => undefined));

// Image is a data URL or relative path; cap at ~2MB worth of base64 to be safe
const imageString = z
  .string()
  .max(3_000_000, "Image is too large")
  .optional()
  .or(z.literal("").transform(() => undefined));

const muscleName = z.string().trim().min(1).max(50);

export const createExerciseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  category: z.string().trim().min(1).max(50),
  type: z.string().trim().min(1).max(50),
  equipment: optionalString(100),
  muscles: z.array(muscleName).max(50),
  instructions: optionalString(5000),
  tips: optionalString(5000),
  image: imageString,
});

export const updateExerciseSchema = createExerciseSchema.partial();

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
