"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";

export async function getClients() {
  const coachId = await getCoachId();
  return db.client.findMany({
    where: { coachId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });
}

export async function getClient(id: string) {
  const coachId = await getCoachId();
  return db.client.findFirst({
    where: { id, coachId },
    include: {
      assignments: {
        include: {
          program: true,
          workouts: {
            include: {
              exercises: true,
            },
            orderBy: { order: "asc" },
          },
          logs: {
            include: {
              exercises: {
                include: {
                  setDetails: true,
                },
              },
            },
            orderBy: { date: "desc" },
          },
        },
      },
      measurements: {
        orderBy: { date: "desc" },
      },
    },
  });
}

export async function createClient(data: {
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  goals?: string;
  healthConditions?: string;
  notes?: string;
  active?: boolean;
}) {
  const coachId = await getCoachId();
  const client = await db.client.create({
    data: {
      ...data,
      active: data.active ?? true,
      coachId,
    },
  });
  revalidatePath("/clients");
  return client;
}

export async function updateClient(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    goals?: string;
    healthConditions?: string;
    notes?: string;
    active?: boolean;
  }
) {
  const coachId = await getCoachId();
  const client = await db.client.update({
    where: { id, coachId },
    data,
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return client;
}

export async function deleteClient(id: string) {
  const coachId = await getCoachId();
  await db.client.delete({ where: { id, coachId } });
  revalidatePath("/clients");
}
