import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToTeam } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How far ahead to remind. Paired with a once-daily cron, every event gets a
// single reminder within ~24h of its start.
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

function reminderBody(
  type: string,
  startTime: Date,
  location: string | null,
): string {
  const label = type.charAt(0) + type.slice(1).toLowerCase();
  const when = new Date(startTime).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return [label, when, location].filter(Boolean).join(" · ");
}

/**
 * Vercel Cron target. Vercel attaches `Authorization: Bearer $CRON_SECRET`
 * automatically when the env var is set; we reject anything else so the route
 * can't be triggered by the public. Sends a one-time reminder push for each
 * upcoming event whose reminder hasn't gone out yet.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + LOOKAHEAD_MS);

  const events = await db.teamEvent.findMany({
    where: {
      reminderSentAt: null,
      notifyParents: true,
      startTime: { gt: now, lte: windowEnd },
    },
    select: {
      id: true,
      teamId: true,
      title: true,
      type: true,
      startTime: true,
      location: true,
      team: { select: { name: true } },
    },
  });

  let sent = 0;
  for (const e of events) {
    try {
      await sendPushToTeam(e.teamId, {
        title: `Reminder: ${e.team.name}`,
        body: `${e.title} — ${reminderBody(e.type, e.startTime, e.location)}`,
        url: "/portal",
        tag: `reminder:${e.id}`,
      });
      await db.teamEvent.update({
        where: { id: e.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error("[cron] event reminder failed", e.id, err);
    }
  }

  return NextResponse.json({ ok: true, considered: events.length, sent });
}
