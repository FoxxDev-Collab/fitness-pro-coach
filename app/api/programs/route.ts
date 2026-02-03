import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const programs = await db.program.findMany({
    orderBy: { name: "asc" },
    include: {
      workouts: {
        select: { id: true },
      },
    },
  });
  return NextResponse.json(programs);
}
