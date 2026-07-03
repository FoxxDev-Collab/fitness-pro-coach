"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  savePushSubscription,
  deletePushSubscription,
  sendTestPushToSelf,
} from "@/lib/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type Status = "loading" | "unsupported" | "default" | "enabled" | "denied" | "busy";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? navigator.serviceWorker.register("/sw.js");
}

/** Header toggle to opt in/out of team push notifications, per device. */
export function NotificationToggle() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    // All detection runs inside the async callback so no setState fires
    // synchronously in the effect body (avoids cascading-render warning).
    let cancelled = false;
    (async () => {
      if (!pushSupported()) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = (await reg?.pushManager.getSubscription()) ?? null;
        if (!cancelled) setStatus(sub ? "enabled" : "default");
      } catch {
        if (!cancelled) setStatus("default");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setStatus("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }
      const reg = await ensureRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      await savePushSubscription({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      setStatus("enabled");
      // Confirmation buzz so the user knows it worked.
      sendTestPushToSelf().catch(() => {});
    } catch (err) {
      console.error("Enable notifications failed", err);
      setStatus("default");
    }
  }

  async function disable() {
    setStatus("busy");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("default");
    } catch (err) {
      console.error("Disable notifications failed", err);
      setStatus("enabled");
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  if (status === "denied") {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications blocked"
        title="Notifications are blocked in your browser settings"
        className="text-muted-foreground"
        disabled
      >
        <BellOff className="size-4" />
      </Button>
    );
  }

  const enabled = status === "enabled";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={enabled ? "Turn off notifications" : "Turn on notifications"}
      title={enabled ? "Notifications on — tap to turn off" : "Turn on notifications"}
      onClick={enabled ? disable : enable}
      disabled={status === "busy"}
    >
      {status === "busy" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : enabled ? (
        <BellRing className="size-4 text-primary" />
      ) : (
        <Bell className="size-4" />
      )}
    </Button>
  );
}
