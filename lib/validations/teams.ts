import { z } from "zod";
import { cuid } from "./index";

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal("").transform(() => undefined));

const optionalEmail = z
  .string()
  .max(254)
  .transform((s) => s.trim().toLowerCase())
  .refine((s) => s === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Enter a valid email")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  sport: optionalString(80),
  season: optionalString(50),
  description: optionalString(2000),
});

export const updateTeamSchema = createTeamSchema.partial().extend({
  active: z.boolean().optional(),
});

export const addAthleteSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: optionalEmail,
  phone: optionalString(50),
  position: optionalString(80),
  jerseyNumber: optionalString(20),
  notes: optionalString(5000),
  parentName: optionalString(100),
  parentEmail: optionalEmail,
  parentPhone: optionalString(50),
});

export const updateAthleteSchema = addAthleteSchema.partial().extend({
  active: z.boolean().optional(),
});

export const assignProgramToTeamSchema = z.object({
  teamId: cuid,
  programId: cuid,
  name: z.string().trim().min(1, "Name is required").max(100),
  startDate: z.coerce.date().optional(),
});

export const rolloverTeamSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  season: optionalString(50),
  sport: optionalString(80),
  keepAthletes: z.boolean(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddAthleteInput = z.infer<typeof addAthleteSchema>;
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>;
export type AssignProgramToTeamInput = z.infer<typeof assignProgramToTeamSchema>;
export type RolloverTeamInput = z.infer<typeof rolloverTeamSchema>;
