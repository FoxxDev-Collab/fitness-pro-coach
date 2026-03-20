import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  const deleted = await db.user.deleteMany({ where: { role: "COACH" } });
  console.log(`Deleted ${deleted.count} coach account(s)`);

  const remaining = await db.user.findMany({ select: { email: true, role: true } });
  console.log("Remaining users:", remaining);

  await db.$disconnect();
}

main();
