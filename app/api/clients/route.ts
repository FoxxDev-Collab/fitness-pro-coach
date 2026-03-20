import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await db.client.findMany({
    where: { coachId: session.user.id },
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
