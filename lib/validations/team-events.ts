import { z } from "zod";

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal("").transform(() => undefined));

export const eventTypeSchema = z.enum([
  "PRACTICE",
  "GAME",
  "MEETING",
  "TRYOUT",
  "CAMP",
  "FUNDRAISER",
  "OTHER",
]);

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    type: eventTypeSchema,
    description: optionalString(5000),
    location: optionalString(200),
    opponent: optionalString(200),
    startTime: z.coerce.date(),
    endTime: z.coerce.date().optional(),
    allDay: z.boolean().optional(),
    notifyParents: z.boolean().optional(),
  })
  .refine(
    (d) => !d.endTime || d.endTime >= d.startTime,
    { message: "End time must be after start time", path: ["endTime"] },
  );

export const updateEventSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    type: eventTypeSchema.optional(),
    description: optionalString(5000),
    location: optionalString(200),
    opponent: optionalString(200),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    allDay: z.boolean().optional(),
    notifyParents: z.boolean().optional(),
  })
  .refine(
    (d) => !d.endTime || !d.startTime || d.endTime >= d.startTime,
    { message: "End time must be after start time", path: ["endTime"] },
  );

export const createAnnouncementSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().min(1, "Body is required").max(10_000),
  notifyParents: z.boolean().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
