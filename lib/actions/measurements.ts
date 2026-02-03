"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
  const measurement = await db.measurement.create({
    data,
  });
  revalidatePath(`/clients/${data.clientId}`);
  return measurement;
}

export async function deleteMeasurement(id: string) {
  const measurement = await db.measurement.findUnique({ where: { id } });
  if (measurement) {
    await db.measurement.delete({ where: { id } });
    revalidatePath(`/clients/${measurement.clientId}`);
  }
}
