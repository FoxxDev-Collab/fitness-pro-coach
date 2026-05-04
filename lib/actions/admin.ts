"use server";

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { cuid, parseInput } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { sendPasswordResetEmail, sendAdminInviteEmail } from "@/lib/email";
import {
  listUsersSchema,
  listClientsSchema,
  listTeamsSchema,
  listAuditSchema,
  adminUpdateUserSchema,
  adminUserIdSchema,
  inviteAdminSchema,
  type ListUsersInput,
  type ListClientsInput,
  type ListTeamsInput,
  type ListAuditInput,
  type AdminUpdateUserInput,
  type AdminUserIdInput,
  type InviteAdminInput,
} from "@/lib/validations/admin";

function validateId(id: unknown, label: string): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error(`Invalid ${label}`);
  return parsed.data;
}

function newToken() {
  return randomBytes(32).toString("hex");
}

// ─── Platform stats ────────────────────────────────────────

export async function getPlatformStats() {
  await requireAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    coaches,
    admins,
    clients,
    teams,
    sessions,
    recentSessions,
    onboardedCoaches,
    auditCount,
  ] = await Promise.all([
    db.user.count({ where: { role: "COACH" } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.client.count(),
    db.team.count(),
    db.sessionLog.count(),
    db.sessionLog.count({ where: { date: { gt: sevenDaysAgo } } }),
    db.user.count({ where: { role: "COACH", onboardedAt: { not: null } } }),
    db.auditLog.count(),
  ]);
  return { coaches, admins, clients, teams, sessions, recentSessions, onboardedCoaches, auditCount };
}

// ─── List endpoints (search/filter/paginate) ───────────────

export async function listCoaches(input?: Partial<ListUsersInput>) {
  await requireAdmin();
  const parsed = parseInput(listUsersSchema, { ...input, role: "COACH" });
  if (!parsed.ok) return { error: parsed.error };
  const { q, status, page, pageSize } = parsed.data;

  const where: Prisma.UserWhereInput = { role: "COACH" };
  if (status === "active") where.active = true;
  if (status === "disabled") where.active = false;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { businessName: { contains: q, mode: "insensitive" } },
      { specialty: { contains: q, mode: "insensitive" } },
      { intakeSlug: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        businessName: true,
        specialty: true,
        intakeSlug: true,
        onboardedAt: true,
        _count: { select: { clients: true, programs: true, teams: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function listAdmins() {
  await requireAdmin();
  return db.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, active: true, createdAt: true, emailVerified: true },
  });
}

export async function listClientsAdmin(input?: Partial<ListClientsInput>) {
  await requireAdmin();
  const parsed = parseInput(listClientsSchema, input ?? {});
  if (!parsed.ok) return { error: parsed.error };
  const { q, status, hasAccount, page, pageSize } = parsed.data;

  const where: Prisma.ClientWhereInput = {};
  if (status === "active") where.active = true;
  if (status === "inactive") where.active = false;
  if (hasAccount === "yes") where.userId = { not: null };
  if (hasAccount === "no") where.userId = null;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { coach: { name: { contains: q, mode: "insensitive" } } },
      { coach: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    db.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        userId: true,
        coach: { select: { id: true, name: true, email: true } },
        _count: { select: { assignments: true } },
      },
    }),
    db.client.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function listTeamsAdmin(input?: Partial<ListTeamsInput>) {
  await requireAdmin();
  const parsed = parseInput(listTeamsSchema, input ?? {});
  if (!parsed.ok) return { error: parsed.error };
  const { q, page, pageSize } = parsed.data;

  const where: Prisma.TeamWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sport: { contains: q, mode: "insensitive" } },
      { coach: { name: { contains: q, mode: "insensitive" } } },
      { coach: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    db.team.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        sport: true,
        season: true,
        active: true,
        createdAt: true,
        coach: { select: { id: true, name: true, email: true } },
        _count: { select: { athletes: true, teamAssignments: true } },
      },
    }),
    db.team.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function listAuditLog(input?: Partial<ListAuditInput>) {
  await requireAdmin();
  const parsed = parseInput(listAuditSchema, input ?? {});
  if (!parsed.ok) return { error: parsed.error };
  const { q, action, page, pageSize } = parsed.data;

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (q) {
    where.OR = [
      { actorEmail: { contains: q, mode: "insensitive" } },
      { targetId: { contains: q } },
      { action: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

// ─── Detail endpoints ──────────────────────────────────────

export async function getCoachDetail(id: string) {
  await requireAdmin();
  const safeId = validateId(id, "coach id");

  return db.user.findUnique({
    where: { id: safeId, role: "COACH" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      active: true,
      createdAt: true,
      businessName: true,
      specialty: true,
      bio: true,
      intakeSlug: true,
      timezone: true,
      onboardedAt: true,
      mfaEnabled: true,
      clients: {
        select: {
          id: true, name: true, email: true, active: true,
          _count: { select: { assignments: true } },
        },
        orderBy: { name: "asc" },
      },
      programs: {
        select: {
          id: true, name: true,
          _count: { select: { assignments: true, workouts: true } },
        },
        orderBy: { name: "asc" },
      },
      teams: {
        select: {
          id: true, name: true, sport: true, active: true,
          _count: { select: { athletes: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function getAdminDetail(id: string) {
  await requireAdmin();
  const safeId = validateId(id, "admin id");
  return db.user.findUnique({
    where: { id: safeId, role: "ADMIN" },
    select: {
      id: true, name: true, email: true, active: true, createdAt: true,
      emailVerified: true, mfaEnabled: true,
    },
  });
}

export async function getClientDetailAdmin(id: string) {
  await requireAdmin();
  const safeId = validateId(id, "client id");
  return db.client.findUnique({
    where: { id: safeId },
    select: {
      id: true, name: true, email: true, phone: true, gender: true,
      goals: true, healthConditions: true, notes: true, active: true,
      createdAt: true, updatedAt: true, userId: true,
      coach: { select: { id: true, name: true, email: true } },
      assignments: {
        select: {
          id: true, name: true, assignedAt: true,
          program: { select: { name: true } },
          _count: { select: { logs: true, workouts: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
      measurements: { select: { id: true, date: true, weight: true }, orderBy: { date: "desc" }, take: 5 },
    },
  });
}

export async function getTeamDetailAdmin(id: string) {
  await requireAdmin();
  const safeId = validateId(id, "team id");
  return db.team.findUnique({
    where: { id: safeId },
    select: {
      id: true, name: true, sport: true, season: true, description: true,
      active: true, createdAt: true,
      coach: { select: { id: true, name: true, email: true } },
      athletes: {
        select: { id: true, name: true, email: true, position: true, jerseyNumber: true, active: true },
        orderBy: { name: "asc" },
      },
      _count: { select: { teamAssignments: true, events: true, announcements: true } },
    },
  });
}

// ─── User write actions (audit-logged) ─────────────────────

export async function toggleUserStatus(input: AdminUserIdInput | string) {
  const session = await requireAdmin();
  const userId = typeof input === "string" ? input : input.userId;
  const safeId = validateId(userId, "user id");
  if (safeId === session.user?.id) return { error: "You cannot disable your own account" };

  const user = await db.user.findUnique({ where: { id: safeId } });
  if (!user) return { error: "User not found" };

  const updated = await db.user.update({
    where: { id: safeId },
    data: { active: !user.active },
  });

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "user.toggle_status",
    targetType: "user",
    targetId: user.id,
    metadata: { from: user.active, to: updated.active, email: user.email, role: user.role },
  });

  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${safeId}`);
  revalidatePath("/admin/admins");
  return { success: true };
}

export async function adminUpdateUser(input: AdminUpdateUserInput) {
  const session = await requireAdmin();
  const parsed = parseInput(adminUpdateUserSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  const { userId, ...rest } = parsed.data;

  const before = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, businessName: true, specialty: true, bio: true, timezone: true },
  });
  if (!before) return { error: "User not found" };

  const data: Prisma.UserUpdateInput = {};
  if (rest.name !== undefined) data.name = rest.name;
  if (rest.businessName !== undefined) data.businessName = rest.businessName;
  if (rest.specialty !== undefined) data.specialty = rest.specialty;
  if (rest.bio !== undefined) data.bio = rest.bio;
  if (rest.timezone !== undefined) data.timezone = rest.timezone;
  if (rest.email !== undefined && rest.email !== before.email) {
    const existing = await db.user.findUnique({ where: { email: rest.email }, select: { id: true } });
    if (existing && existing.id !== userId) return { error: "Email is already in use by another user" };
    data.email = rest.email;
    data.emailVerified = null;
  }

  await db.user.update({ where: { id: userId }, data });

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "user.update_profile",
    targetType: "user",
    targetId: userId,
    metadata: {
      changedKeys: Object.keys(data),
      previousEmail: rest.email && rest.email !== before.email ? before.email : undefined,
      newEmail: rest.email && rest.email !== before.email ? rest.email : undefined,
    },
  });

  revalidatePath(`/admin/coaches/${userId}`);
  revalidatePath("/admin/coaches");
  revalidatePath("/admin/admins");
  return { success: true };
}

export async function adminResetPassword(input: AdminUserIdInput | string) {
  const session = await requireAdmin();
  const userId = typeof input === "string" ? input : input.userId;
  const safeId = validateId(userId, "user id");

  const user = await db.user.findUnique({ where: { id: safeId } });
  if (!user) return { error: "User not found" };

  await db.passwordResetToken.updateMany({
    where: { email: user.email, used: false },
    data: { used: true },
  });

  const t = await db.passwordResetToken.create({
    data: { email: user.email, token: newToken(), expires: new Date(Date.now() + 60 * 60 * 1000) },
  });

  try {
    await sendPasswordResetEmail(user.email, t.token);
  } catch (e) {
    console.error("Failed to send admin-triggered reset email:", e);
    return { error: "Could not send the reset email — try again or check email configuration" };
  }

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "user.reset_password",
    targetType: "user",
    targetId: user.id,
    metadata: { email: user.email },
  });

  return { success: true };
}

export async function adminPromoteToAdmin(input: AdminUserIdInput | string) {
  const session = await requireAdmin();
  const userId = typeof input === "string" ? input : input.userId;
  const safeId = validateId(userId, "user id");

  const user = await db.user.findUnique({ where: { id: safeId } });
  if (!user) return { error: "User not found" };
  if (user.role === "ADMIN") return { error: "User is already an admin" };

  await db.user.update({ where: { id: safeId }, data: { role: "ADMIN" } });

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "user.promote_to_admin",
    targetType: "user",
    targetId: user.id,
    metadata: { email: user.email, fromRole: user.role },
  });

  revalidatePath("/admin/coaches");
  revalidatePath("/admin/admins");
  revalidatePath(`/admin/coaches/${safeId}`);
  return { success: true };
}

export async function adminDemoteToCoach(input: AdminUserIdInput | string) {
  const session = await requireAdmin();
  const userId = typeof input === "string" ? input : input.userId;
  const safeId = validateId(userId, "user id");

  const user = await db.user.findUnique({ where: { id: safeId } });
  if (!user) return { error: "User not found" };
  if (user.role !== "ADMIN") return { error: "User is not an admin" };
  if (session.user?.id === user.id) return { error: "You cannot demote yourself — ask another admin" };

  const adminCount = await db.user.count({ where: { role: "ADMIN", active: true } });
  if (adminCount <= 1) return { error: "Cannot demote — at least one active admin must remain" };

  await db.user.update({ where: { id: safeId }, data: { role: "COACH" } });

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "user.demote_to_coach",
    targetType: "user",
    targetId: user.id,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/coaches");
  revalidatePath("/admin/admins");
  revalidatePath(`/admin/coaches/${safeId}`);
  return { success: true };
}

export async function adminDeleteUser(input: AdminUserIdInput | string) {
  const session = await requireAdmin();
  const userId = typeof input === "string" ? input : input.userId;
  const safeId = validateId(userId, "user id");

  const user = await db.user.findUnique({ where: { id: safeId } });
  if (!user) return { error: "User not found" };
  if (session.user?.id === user.id) return { error: "You cannot delete your own account" };
  if (user.role === "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN", active: true } });
    if (adminCount <= 1) return { error: "Cannot delete — at least one admin must remain" };
  }

  await db.user.delete({ where: { id: safeId } });

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "user.delete",
    targetType: "user",
    targetId: user.id,
    metadata: { email: user.email, role: user.role, name: user.name },
  });

  revalidatePath("/admin/coaches");
  revalidatePath("/admin/admins");
  revalidatePath("/admin/clients");
  return { success: true };
}

export async function adminInviteAdmin(input: InviteAdminInput) {
  const session = await requireAdmin();
  const parsed = parseInput(inviteAdminSchema, input);
  if (!parsed.ok) return { error: parsed.error };
  const { email, name } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === "ADMIN") return { error: "That user is already an admin" };
    await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    await logAudit({
      actorUserId: session.user?.id ?? null,
      actorEmail: session.user?.email ?? null,
      action: "user.promote_to_admin",
      targetType: "user",
      targetId: existing.id,
      metadata: { email, viaInviteFlow: true, fromRole: existing.role },
    });
    revalidatePath("/admin/admins");
    return { success: true, mode: "promoted" as const };
  }

  const user = await db.user.create({
    data: { email, name: name ?? null, role: "ADMIN", active: true },
  });

  // Use the password-reset token mechanism for first-time setup (7-day window)
  const t = await db.passwordResetToken.create({
    data: { email, token: newToken(), expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  try {
    const inviterName = session.user?.email ?? "An administrator";
    await sendAdminInviteEmail(email, t.token, inviterName);
  } catch (e) {
    console.error("Failed to send admin invite email:", e);
    return { error: "User created but invitation email failed — resend from the admin profile" };
  }

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "user.invite_admin",
    targetType: "user",
    targetId: user.id,
    metadata: { email },
  });

  revalidatePath("/admin/admins");
  return { success: true, mode: "invited" as const };
}

// ─── CSV exports ───────────────────────────────────────────

function csvEscape(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const out = [headers.join(",")];
  for (const r of rows) out.push(r.map(csvEscape).join(","));
  return out.join("\n");
}

export async function exportCoachesCsv(): Promise<{ filename: string; csv: string }> {
  const session = await requireAdmin();
  const coaches = await db.user.findMany({
    where: { role: "COACH" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, active: true, createdAt: true,
      businessName: true, specialty: true, intakeSlug: true, timezone: true,
      onboardedAt: true, emailVerified: true,
      _count: { select: { clients: true, programs: true, teams: true } },
    },
  });

  const csv = toCsv(
    ["id", "name", "email", "businessName", "specialty", "intakeSlug", "timezone", "active", "emailVerified", "onboardedAt", "createdAt", "clients", "programs", "teams"],
    coaches.map((c) => [
      c.id, c.name, c.email, c.businessName, c.specialty, c.intakeSlug, c.timezone,
      c.active, !!c.emailVerified, c.onboardedAt?.toISOString() ?? null, c.createdAt.toISOString(),
      c._count.clients, c._count.programs, c._count.teams,
    ]),
  );

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "data.export",
    targetType: "system",
    metadata: { kind: "coaches", count: coaches.length },
  });

  return { filename: `praevio-coaches-${new Date().toISOString().slice(0, 10)}.csv`, csv };
}

export async function exportClientsCsv(): Promise<{ filename: string; csv: string }> {
  const session = await requireAdmin();
  const clients = await db.client.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, phone: true, active: true, createdAt: true,
      userId: true,
      coach: { select: { name: true, email: true } },
      _count: { select: { assignments: true } },
    },
  });

  const csv = toCsv(
    ["id", "name", "email", "phone", "active", "hasAccount", "coachName", "coachEmail", "assignments", "createdAt"],
    clients.map((c) => [
      c.id, c.name, c.email, c.phone, c.active, !!c.userId,
      c.coach?.name ?? null, c.coach?.email ?? null,
      c._count.assignments, c.createdAt.toISOString(),
    ]),
  );

  await logAudit({
    actorUserId: session.user?.id ?? null,
    actorEmail: session.user?.email ?? null,
    action: "data.export",
    targetType: "system",
    metadata: { kind: "clients", count: clients.length },
  });

  return { filename: `praevio-clients-${new Date().toISOString().slice(0, 10)}.csv`, csv };
}

// ─── Backwards-compatible aliases (existing callers) ───────

/** @deprecated use listCoaches instead */
export async function getCoaches() {
  const r = await listCoaches({ pageSize: 100 });
  if ("error" in r) return [];
  return r.items;
}

/** @deprecated use listClientsAdmin instead */
export async function getAllClients() {
  const r = await listClientsAdmin({ pageSize: 100 });
  if ("error" in r) return [];
  return r.items;
}
