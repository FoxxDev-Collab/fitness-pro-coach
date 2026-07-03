"use server";

import { db } from "@/lib/db";
import { requirePortal } from "@/lib/auth-utils";
import { sendPushToUsers } from "@/lib/push/send";

type IncomingSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Register (or refresh) the calling portal user's web-push device. */
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

/** Remove a device the user turned notifications off on. */
export async function deletePushSubscription(endpoint: string) {
  await requirePortal();
  if (typeof endpoint === "string" && endpoint.length > 0) {
    await db.pushSubscription.deleteMany({ where: { endpoint } });
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
