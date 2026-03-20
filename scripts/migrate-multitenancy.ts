import "dotenv/config";

/**
 * Migration script: Add multi-tenancy to existing data
 *
 * Run AFTER `npm run db:push` with the updated schema.
 * Usage: npx tsx scripts/migrate-multitenancy.ts
 *
 * This script:
 * 1. Creates a default coach User for existing data
 * 2. Sets coachId on all existing Client, Exercise, and Program records
 * 3. Optionally creates an admin user
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  console.log("Starting multi-tenancy migration...\n");

  // 1. Create default coach user (or find existing)
  const coachEmail = process.env.DEFAULT_COACH_EMAIL || "coach@praevio.app";
  const coachPassword = process.env.DEFAULT_COACH_PASSWORD || "changeme123";
  const coachName = process.env.DEFAULT_COACH_NAME || "Coach";

  let coach = await db.user.findUnique({ where: { email: coachEmail } });

  if (!coach) {
    const hashed = await bcrypt.hash(coachPassword, 12);
    coach = await db.user.create({
      data: {
        email: coachEmail,
        password: hashed,
        name: coachName,
        role: "COACH",
        emailVerified: new Date(),
      },
    });
    console.log(`Created coach: ${coachEmail} (password: ${coachPassword})`);
    console.log("  ⚠ Change this password immediately!\n");
  } else {
    console.log(`Coach already exists: ${coachEmail}\n`);
  }

  // 2. Update existing clients without a coachId
  const clientsUpdated = await db.client.updateMany({
    where: { coachId: "" },
    data: { coachId: coach.id },
  });
  // Also handle null coachId if the column was just added
  const clientsUpdated2 = await db.$executeRaw`
    UPDATE "Client" SET "coachId" = ${coach.id} WHERE "coachId" IS NULL OR "coachId" = ''
  `;
  console.log(`Updated clients: ${clientsUpdated.count + clientsUpdated2}`);

  // 3. Update existing custom exercises without a coachId
  const exercisesUpdated = await db.$executeRaw`
    UPDATE "Exercise" SET "coachId" = ${coach.id} WHERE "custom" = true AND ("coachId" IS NULL OR "coachId" = '')
  `;
  console.log(`Updated custom exercises: ${exercisesUpdated}`);

  // 4. Update existing programs without a coachId
  const programsUpdated = await db.$executeRaw`
    UPDATE "Program" SET "coachId" = ${coach.id} WHERE "coachId" IS NULL OR "coachId" = ''
  `;
  console.log(`Updated programs: ${programsUpdated}`);

  // 5. Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@praevio.app";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";

  let admin = await db.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    admin = await db.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        name: "Admin",
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });
    console.log(`\nCreated admin: ${adminEmail} (password: ${adminPassword})`);
    console.log("  ⚠ Change this password immediately!");
  } else {
    console.log(`\nAdmin already exists: ${adminEmail}`);
  }

  console.log("\nMigration complete!");
  await db.$disconnect();
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
