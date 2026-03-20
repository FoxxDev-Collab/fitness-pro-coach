import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  const updated = await db.user.updateMany({
    where: { role: "ADMIN", emailVerified: null },
    data: { emailVerified: new Date() },
  });
  console.log(`Verified ${updated.count} admin account(s)`);
  await db.$disconnect();
}

main();
