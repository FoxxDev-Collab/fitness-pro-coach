"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { cuid, parseInput } from "@/lib/validations";
import {
  createClientSchema,
  updateClientSchema,
  type CreateClientInput,
  type UpdateClientInput,
} from "@/lib/validations/clients";

function validateId(id: unknown): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error("Invalid client id");
  return parsed.data;
}

export async function getClients() {
  const coachId = await getCoachId();
  return db.client.findMany({
    where: { coachId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { assignments: true },
      },
      assignments: {
        select: {
          logs: {
            select: { date: true },
            orderBy: { date: "desc" },
          },
        },
      },
    },
  });
}

export async function getClient(id: string) {
  const safeId = validateId(id);
  const coachId = await getCoachId();
  return db.client.findFirst({
    where: { id: safeId, coachId },
    include: {
      assignments: {
        include: {
          program: true,
          workouts: {
            include: {
              exercises: {
                orderBy: { order: "asc" },
              },
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

export async function createClient(data: CreateClientInput) {
  const parsed = parseInput(createClientSchema, data);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  const client = await db.client.create({
    data: {
      ...parsed.data,
      active: parsed.data.active ?? true,
      coachId,
    },
  });
  revalidatePath("/clients");
  return client;
}

export async function updateClient(id: string, data: UpdateClientInput) {
  const safeId = validateId(id);
  const parsed = parseInput(updateClientSchema, data);
  if (!parsed.ok) throw new Error(parsed.error);

  const coachId = await getCoachId();
  const client = await db.client.update({
    where: { id: safeId, coachId },
    data: parsed.data,
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${safeId}`);
  return client;
}

export async function deleteClient(id: string) {
  const safeId = validateId(id);
  const coachId = await getCoachId();
  await db.client.delete({ where: { id: safeId, coachId } });
  revalidatePath("/clients");
}
