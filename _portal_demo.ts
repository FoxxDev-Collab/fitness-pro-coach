import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes } from "crypto";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_EMAIL = "foxxdev.collab@gmail.com";
const DEMO_NAME = "Demo Runner (portal test)";
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function genCode(n = 8) {
  const b = randomBytes(n);
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[b[i]! % ALPHABET.length];
  return s;
}

async function main() {
  if (process.argv[2] === "cleanup") {
    await db.portalMagicToken.deleteMany({ where: { email: DEMO_EMAIL } });
    await db.athlete.deleteMany({ where: { name: DEMO_NAME } });
    await db.user.deleteMany({ where: { email: DEMO_EMAIL, role: "PORTAL" } });
    console.log("CLEANED");
    return;
  }

  // Pick the team with the most schedule/results content so there's something to see.
  const teams = await db.team.findMany({
    select: {
      id: true,
      name: true,
      season: true,
      joinCode: true,
      _count: { select: { events: true } },
    },
  });
  if (teams.length === 0) {
    console.log("NO_TEAM — create a team first");
    return;
  }
  teams.sort((a, b) => b._count.events - a._count.events);
  const team = teams[0]!;

  let joinCode = team.joinCode;
  if (!joinCode) {
    joinCode = genCode();
    await db.team.update({ where: { id: team.id }, data: { joinCode } });
  }

  // Ensure a demo athlete on that team linked to the demo email (as both the
  // athlete and the parent, so either match path works).
  const existing = await db.athlete.findFirst({ where: { name: DEMO_NAME, teamId: team.id } });
  if (!existing) {
    await db.athlete.create({
      data: {
        name: DEMO_NAME,
        teamId: team.id,
        email: DEMO_EMAIL,
        parentEmail: DEMO_EMAIL,
        gender: "M",
        active: true,
      },
    });
  }

  // A direct magic-link token for instant access (skips the email step).
  const token = randomBytes(32).toString("hex");
  await db.portalMagicToken.create({
    data: {
      email: DEMO_EMAIL,
      teamId: team.id,
      token,
      expires: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  console.log("TEAM=" + team.name + (team.season ? " (" + team.season + ")" : ""));
  console.log("JOIN_CODE=" + joinCode);
  console.log("JOIN_URL=https://praevio.fitness/join/" + joinCode);
  console.log("DIRECT_URL=https://praevio.fitness/portal/verify/" + token);
}

main().catch(console.error).finally(() => process.exit(0));
