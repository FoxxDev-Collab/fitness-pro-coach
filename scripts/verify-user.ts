import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2];
const setClient = process.argv.includes("--set-client");

if (!email) {
  console.error("Usage: tsx scripts/verify-user.ts <email> [--set-client]");
  process.exit(1);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  const before = await db.user.findUnique({
    where: { email },
    select: {
      id: true, email: true, role: true, active: true,
      emailVerified: true, password: true,
      clientProfile: { select: { id: true, name: true, coachId: true } },
    },
  });

  if (!before) {
    console.error(`No user found with email: ${email}`);
    await db.$disconnect();
    process.exit(1);
  }

  console.log("Before:", { ...before, password: before.password ? "<set>" : null });

  const data: { emailVerified?: Date; role?: "CLIENT" } = {};
  if (!before.emailVerified) data.emailVerified = new Date();
  if (setClient && before.role !== "CLIENT") data.role = "CLIENT";

  if (Object.keys(data).length === 0) {
    console.log("Nothing to update.");
    await db.$disconnect();
    return;
  }

  await db.user.update({ where: { email }, data });

  console.log(`Updated ${email}:`, data);
  await db.$disconnect();
}

main();
