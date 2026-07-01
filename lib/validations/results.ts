import { z } from "zod";

export const disciplineUnitSchema = z.enum(["TIME", "DISTANCE", "WEIGHT", "POINTS"]);
export const resultDirectionSchema = z.enum(["LOWER_BETTER", "HIGHER_BETTER"]);

export const disciplineSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  unitType: disciplineUnitSchema,
  direction: resultDirectionSchema,
  distanceMeters: z.number().int().positive().optional(),
});

export const splitSchema = z.object({
  order: z.number().int().min(1),
  label: z.string().trim().max(40).optional(),
  value: z.number().positive(),
});

export const resultRowSchema = z
  .object({
    athleteId: z.string().min(1),
    disciplineId: z.string().min(1),
    value: z.number().positive().optional(),
    place: z.number().int().positive().optional(),
    squad: z.string().trim().max(40).optional(),
    dnf: z.boolean().default(false),
    notes: z.string().trim().max(500).optional(),
    splits: z.array(splitSchema).max(20).optional(),
  })
  .refine((r) => r.dnf || r.value != null, {
    message: "A time/mark is required unless the runner is marked DNF",
    path: ["value"],
  });

export const saveMeetResultsSchema = z.object({
  rows: z.array(resultRowSchema).max(200),
});

export const opponentScoreSchema = z.object({
  groupLabel: z.string().trim().min(1).max(60),
  opponentName: z.string().trim().min(1).max(120),
  score: z.number().int().min(0),
});

export const setOpponentScoresSchema = z.object({
  entries: z.array(opponentScoreSchema).max(20),
});

export type DisciplineInput = z.infer<typeof disciplineSchema>;
export type ResultRowInput = z.infer<typeof resultRowSchema>;
export type SaveMeetResultsInput = z.infer<typeof saveMeetResultsSchema>;
export type OpponentScoreInput = z.infer<typeof opponentScoreSchema>;
