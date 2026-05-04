"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { cuid } from "@/lib/validations";

function validateId(id: unknown, label: string): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error(`Invalid ${label}`);
  return parsed.data;
}

export async function getPlatformStats() {
  await requireAdmin();

  const [coaches, clients, sessions, recentSessions] = await Promise.all([
    db.user.count({ where: { role: "COACH" } }),
    db.client.count(),
    db.sessionLog.count(),
    db.sessionLog.count({
      where: { date: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return { coaches, clients, sessions, recentSessions };
}

export async function getCoaches() {
  await requireAdmin();

  return db.user.findMany({
    where: { role: "COACH" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
      _count: {
        select: {
          clients: true,
          programs: true,
        },
      },
    },
  });
}

export async function getCoachDetail(id: string) {
  await requireAdmin();
  const safeId = validateId(id, "coach id");

  return db.user.findUnique({
    where: { id: safeId, role: "COACH" },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
      clients: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          _count: { select: { assignments: true } },
        },
        orderBy: { name: "asc" },
      },
      programs: {
        select: {
          id: true,
          name: true,
          _count: { select: { assignments: true, workouts: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });
}

export async function getAllClients() {
  await requireAdmin();

  return db.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
      coach: { select: { name: true, email: true } },
      userId: true,
      _count: {
        select: { assignments: true },
      },
    },
  });
}

export async function toggleUserStatus(userId: string) {
  const adminSession = await requireAdmin();
  const safeId = validateId(userId, "user id");

  // Don't let admins disable themselves
  if (safeId === adminSession.user?.id) {
    throw new Error("You cannot disable your own account");
  }

  const user = await db.user.findUnique({ where: { id: safeId } });
  if (!user) throw new Error("User not found");

  await db.user.update({
    where: { id: safeId },
    data: { active: !user.active },
  });

  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${safeId}`);
}
