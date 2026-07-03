"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Share, Plus } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Install-availability as an external browser store, read via
 * useSyncExternalStore. This keeps the environment detection out of an effect
 * (no synchronous setState / cascading renders) and is SSR-safe: the server
 * snapshot is always "unavailable", so nothing renders until the client knows.
 */
type InstallState = { canPrompt: boolean; installed: boolean; isIOS: boolean };

const SERVER_STATE: InstallState = { canPrompt: false, installed: false, isIOS: false };

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let state: InstallState = SERVER_STATE;
let initialized = false;
const listeners = new Set<() => void>();

function setState(next: InstallState) {
  state = next;
  listeners.forEach((l) => l());
}

function detectStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function initOnce() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  state = { canPrompt: false, installed: detectStandalone(), isIOS };

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    setState({ ...state, canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    setState({ ...state, canPrompt: false, installed: true });
  });
}

function subscribe(cb: () => void) {
  initOnce();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;
const getServerSnapshot = () => SERVER_STATE;

async function promptInstall() {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  setState({ ...state, canPrompt: false });
}

/**
 * "Install app" affordance. On Chromium it fires the native install prompt; on
 * iOS Safari (no such event) it shows the manual Add-to-Home-Screen steps.
 * Renders nothing once installed or where installation isn't offered.
 */
export function InstallAppButton({
  className,
  variant = "outline",
  size = "sm",
  label = "Install app",
}: {
  className?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg";
  label?: string;
}) {
  const { canPrompt, installed, isIOS } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (installed) return null;
  if (!canPrompt && !isIOS) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => (canPrompt ? promptInstall() : setShowIOSHelp(true))}
      >
        <Download className="size-4 mr-1.5" /> {label}
      </Button>

      <Dialog open={showIOSHelp} onOpenChange={setShowIOSHelp}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add to Home Screen</DialogTitle>
            <DialogDescription>
              Install Praevio for one-tap access, just like an app.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                1
              </span>
              Tap the <Share className="size-4" /> Share button in Safari.
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                2
              </span>
              Choose <Plus className="size-4" /> &ldquo;Add to Home Screen&rdquo;.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
