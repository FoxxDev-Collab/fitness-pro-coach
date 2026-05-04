"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { cuid, parseInput } from "@/lib/validations";
import {
  createMeasurementSchema,
  type CreateMeasurementInput,
} from "@/lib/validations/measurements";

function validateId(id: unknown): string {
  const parsed = cuid.safeParse(id);
  if (!parsed.success) throw new Error("Invalid id");
  return parsed.data;
}

export async function createMeasurement(input: CreateMeasurementInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = parseInput(createMeasurementSchema, input);
  if (!parsed.ok) throw new Error(parsed.error);
  const data = parsed.data;

  // Verify coach owns this client
  const client = await db.client.findFirst({
    where: { id: data.clientId, coachId: session.user.id },
  });
  if (!client) throw new Error("Client not found");

  const measurement = await db.measurement.create({ data });
  revalidatePath(`/clients/${data.clientId}`);
  return measurement;
}

export async function deleteMeasurement(id: string) {
  const safeId = validateId(id);
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const measurement = await db.measurement.findUnique({
    where: { id: safeId },
    include: { client: { select: { coachId: true, id: true } } },
  });
  if (!measurement || measurement.client.coachId !== session.user.id) return;

  await db.measurement.delete({ where: { id: safeId } });
  revalidatePath(`/clients/${measurement.client.id}`);
}
