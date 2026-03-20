"use server";

import { db } from "@/lib/db";
import { getClientUserId } from "@/lib/auth-utils";

export async function getMyProfile() {
  const userId = await getClientUserId();

  const client = await db.client.findFirst({
    where: { userId },
    include: {
      coach: { select: { name: true } },
    },
  });

  return client;
}

export async function getMyAssignments() {
  const userId = await getClientUserId();

  const client = await db.client.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!client) return [];

  return db.assignment.findMany({
    where: { clientId: client.id },
    include: {
      program: { select: { name: true } },
      workouts: {
        include: {
          exercises: true,
        },
        orderBy: { order: "asc" },
      },
      logs: {
        orderBy: { date: "desc" },
        take: 5,
        select: {
          id: true,
          date: true,
          duration: true,
          workoutIndex: true,
        },
      },
    },
  });
}

export async function getMyProgress() {
  const userId = await getClientUserId();

  const client = await db.client.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!client) return { measurements: [], logs: [] };

  const [measurements, logs] = await Promise.all([
    db.measurement.findMany({
      where: { clientId: client.id },
      orderBy: { date: "desc" },
    }),
    db.sessionLog.findMany({
      where: {
        assignment: { clientId: client.id },
      },
      include: {
        exercises: {
          include: { setDetails: true },
        },
        assignment: {
          select: {
            workouts: {
              select: { name: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return { measurements, logs };
}
