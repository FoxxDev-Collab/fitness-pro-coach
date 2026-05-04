import { z } from "zod";

export const noteContent = z.string().trim().min(1, "Content is required").max(10_000);

export const noteCategorySchema = z.enum(["GENERAL", "GAME", "PRACTICE", "MEETING", "SCOUTING"]);

export const createNoteSchema = z.object({
  content: noteContent,
  category: noteCategorySchema.optional(),
});

export const updateNoteSchema = z.object({
  content: noteContent,
  category: noteCategorySchema.optional(),
});
