import { z } from "zod";
import { cuid } from "./index";

const optionalNumber = z
  .number()
  .min(0)
  .max(2000)
  .optional()
  .nullable();

export const createMeasurementSchema = z.object({
  clientId: cuid,
  date: z.coerce.date(),
  weight: optionalNumber,
  bodyFat: optionalNumber,
  chest: optionalNumber,
  waist: optionalNumber,
  hips: optionalNumber,
  arms: optionalNumber,
  thighs: optionalNumber,
});

export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;
