"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function createMeasurement(data: {
  clientId: string;
  date: Date;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  // Verify coach owns this client
  const client = await db.client.findFirst({
    where: { id: data.clientId, coachId: session.user.id },
  });
  if (!client) throw new Error("Client not found");

  const measurement = await db.measurement.create({
    data,
  });
  revalidatePath(`/clients/${data.clientId}`);
  return measurement;
}

export async function deleteMeasurement(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const measurement = await db.measurement.findUnique({
    where: { id },
    include: { client: { select: { coachId: true, id: true } } },
  });
  if (!measurement || measurement.client.coachId !== session.user.id) return;

  await db.measurement.delete({ where: { id } });
  revalidatePath(`/clients/${measurement.client.id}`);
}
