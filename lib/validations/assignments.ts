import { z } from "zod";
import { cuid } from "./index";

export const assignProgramSchema = z.object({
  clientId: cuid,
  programId: cuid,
  name: z.string().trim().min(1, "Name is required").max(100),
  startDate: z.coerce.date().optional(),
});

export type AssignProgramInput = z.infer<typeof assignProgramSchema>;
