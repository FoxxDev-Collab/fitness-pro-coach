import { z } from "zod";
import { cuid } from "./index";

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal("").transform(() => undefined));

export const metricScopeSchema = z.enum(["TEAM", "ATHLETE"]);

export const createMetricDefinitionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  unit: z.string().trim().min(1, "Unit is required").max(50),
  scope: metricScopeSchema,
  description: optionalString(2000),
});

export const updateMetricDefinitionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  unit: z.string().trim().min(1).max(50).optional(),
  description: optionalString(2000),
});

export const recordMetricEntrySchema = z.object({
  metricDefinitionId: cuid,
  teamId: cuid.optional(),
  athleteId: cuid.optional(),
  eventId: cuid.optional(),
  value: z.number().min(-1_000_000).max(1_000_000),
  notes: optionalString(2000),
  date: z.coerce.date(),
});

export const updateMetricEntrySchema = z.object({
  value: z.number().min(-1_000_000).max(1_000_000).optional(),
  notes: optionalString(2000),
  date: z.coerce.date().optional(),
  eventId: cuid.optional(),
});

export type CreateMetricDefinitionInput = z.infer<typeof createMetricDefinitionSchema>;
export type UpdateMetricDefinitionInput = z.infer<typeof updateMetricDefinitionSchema>;
export type RecordMetricEntryInput = z.infer<typeof recordMetricEntrySchema>;
export type UpdateMetricEntryInput = z.infer<typeof updateMetricEntrySchema>;
