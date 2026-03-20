"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

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

  return db.user.findUnique({
    where: { id, role: "COACH" },
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
  await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  await db.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });

  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${userId}`);
}
