"use server";

import { db } from "@/lib/db";
import { requirePortal } from "@/lib/auth-utils";
import { sendPushToUsers } from "@/lib/push/send";

type IncomingSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Register (or refresh) the calling portal user's web-push device.
 *
 * The upsert binds the endpoint to the current user, reassigning it if it was
 * previously another user's. That is intentional: the endpoint is a per-browser
 * capability the caller physically holds (their own `pushManager.subscribe`
 * just produced it), so on a shared device the newly signed-in user must take
 * it over — otherwise the previous user's team pushes would keep landing on a
 * browser they've logged out of. It isn't an IDOR: a push endpoint is an
 * unguessable, non-enumerable secret that is never exposed to other users, so
 * an attacker can't present an endpoint they don't already control.
 */
export async function savePushSubscription(sub: IncomingSubscription) {
  const session = await requirePortal();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error("Invalid subscription");
  }
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: {
      userId: session.user.id,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    create: {
      userId: session.user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  });
  return { ok: true };
}

/** Remove a device the user turned notifications off on. Scoped to the caller
 *  so a user can only delete their own subscription, never someone else's. */
export async function deletePushSubscription(endpoint: string) {
  const session = await requirePortal();
  if (typeof endpoint === "string" && endpoint.length > 0) {
    await db.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });
  }
  return { ok: true };
}

/** Fire a confirmation push to the user's own devices (used right after opt-in). */
export async function sendTestPushToSelf() {
  const session = await requirePortal();
  await sendPushToUsers([session.user.id], {
    title: "Notifications on ✓",
    body: "You'll get your team's announcements and schedule updates here.",
    url: "/portal",
    tag: "praevio-test",
  });
  return { ok: true };
}
