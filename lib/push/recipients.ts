import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/portal/linking";

/**
 * PORTAL user ids linked to a team — parents and athletes matched by the roster
 * emails (`Athlete.email` / `Athlete.parentEmail`). Portal user emails are
 * stored normalized (lowercase) at sign-in, and roster emails are normalized
 * here, so a plain `in` match is correct.
 */
export async function portalUserIdsForTeam(teamId: string): Promise<string[]> {
  const athletes = await db.athlete.findMany({
    where: { teamId, active: true },
    select: { email: true, parentEmail: true },
  });

  const emails = new Set<string>();
  for (const a of athletes) {
    const own = normalizeEmail(a.email);
    const parent = normalizeEmail(a.parentEmail);
    if (own) emails.add(own);
    if (parent) emails.add(parent);
  }
  if (emails.size === 0) return [];

  const users = await db.user.findMany({
    where: { role: "PORTAL", email: { in: [...emails] } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
