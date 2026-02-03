"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getClients() {
  return db.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });
}

export async function getClient(id: string) {
  return db.client.findUnique({
    where: { id },
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
  goals?: string;
  healthConditions?: string;
  notes?: string;
  active?: boolean;
}) {
  const client = await db.client.create({
    data: {
      ...data,
      active: data.active ?? true,
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
    goals?: string;
    healthConditions?: string;
    notes?: string;
    active?: boolean;
  }
) {
  const client = await db.client.update({
    where: { id },
    data,
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return client;
}

export async function deleteClient(id: string) {
  await db.client.delete({ where: { id } });
  revalidatePath("/clients");
}
