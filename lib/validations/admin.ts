import { z } from "zod";
import { cuid } from "./index";

export const listUsersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["all", "active", "disabled"]).default("all"),
  role: z.enum(["all", "ADMIN", "COACH", "CLIENT"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListUsersInput = z.infer<typeof listUsersSchema>;

export const listClientsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  hasAccount: z.enum(["all", "yes", "no"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListClientsInput = z.infer<typeof listClientsSchema>;

export const listTeamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListTeamsInput = z.infer<typeof listTeamsSchema>;

export const listAuditSchema = z.object({
  q: z.string().trim().max(120).optional(),
  action: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListAuditInput = z.infer<typeof listAuditSchema>;

export const adminUpdateUserSchema = z.object({
  userId: cuid,
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(120).optional(),
  businessName: z.string().trim().max(80).nullable().optional(),
  specialty: z.string().trim().max(80).nullable().optional(),
  bio: z.string().trim().max(240).nullable().optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const adminUserIdSchema = z.object({ userId: cuid });
export type AdminUserIdInput = z.infer<typeof adminUserIdSchema>;

export const inviteAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  name: z.string().trim().min(1).max(80).optional(),
});
export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;
