import webpush from "web-push";
import { db } from "@/lib/db";
import { portalUserIdsForTeam } from "@/lib/push/recipients";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@praevio.fitness";

/** Whether web push is configured. When false, every send is a silent no-op. */
export const pushConfigured = !!publicKey && !!privateKey;

if (pushConfigured) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Send a push to every registered device of the given users. Best-effort:
 * failures are logged, and subscriptions the push service reports as gone
 * (404/410) are pruned. Never throws — notifications must not break a write.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!pushConfigured || userIds.length === 0) return;

  const subs = await db.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);
  const gone: string[] = [];

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.id);
        else console.error("[push] send failed", code, err);
      }
    }),
  );

  if (gone.length > 0) {
    await db.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  }
}

/** Convenience: push to all portal users (parents + athletes) linked to a team. */
export async function sendPushToTeam(
  teamId: string,
  payload: PushPayload,
): Promise<void> {
  if (!pushConfigured) return;
  const userIds = await portalUserIdsForTeam(teamId);
  await sendPushToUsers(userIds, payload);
}
