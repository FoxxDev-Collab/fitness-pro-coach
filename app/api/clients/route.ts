import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const clients = await db.client.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      healthConditions: true,
      active: true,
    },
  });
  return NextResponse.json(clients);
}
