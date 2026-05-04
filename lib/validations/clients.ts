import { z } from "zod";

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

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: optionalEmail,
  phone: optionalString(50),
  gender: optionalString(50),
  goals: optionalString(2000),
  healthConditions: optionalString(2000),
  notes: optionalString(5000),
  active: z.boolean().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
