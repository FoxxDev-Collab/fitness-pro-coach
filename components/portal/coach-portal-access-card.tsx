"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Mail,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getTeamJoinInfo,
  regenerateJoinCode,
  emailAllPortal,
  getPortalJoinRequests,
  resolveJoinRequest,
} from "@/lib/actions/portal";

type JoinInfo = {
  joinCode: string;
  joinUrl: string;
  recipientCount: number;
  pendingRequests: number;
};
type JoinRequest = { id: string; email: string; createdAt: string | Date };

export function CoachPortalAccessCard({ teamId }: { teamId: string }) {
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<null | "regen" | "email">(null);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTeamJoinInfo(teamId), getPortalJoinRequests(teamId)])
      .then(([i, r]) => {
        if (cancelled) return;
        setInfo(i);
        setRequests(r);
      })
      .catch((e) => console.error(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  async function handleCopy() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  async function handleRegenerate() {
    if (!info) return;
    if (
      !confirm(
        "Generate a new code? The old link and code will stop working for anyone who hasn't joined yet.",
      )
    )
      return;
    setBusy("regen");
    try {
      const next = await regenerateJoinCode(teamId);
      setInfo({ ...info, ...next });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  async function handleEmailAll() {
    setBusy("email");
    setEmailResult(null);
    try {
      const res = await emailAllPortal(teamId);
      setEmailResult(
        res.total === 0
          ? "No parent or athlete emails on the roster yet."
          : `Sent ${res.sent} of ${res.total}${res.failed ? ` (${res.failed} failed)` : ""}.`,
      );
    } catch (e) {
      setEmailResult(e instanceof Error ? e.message : "Couldn't send.");
    } finally {
      setBusy(null);
    }
  }

  async function handleResolve(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      await resolveJoinRequest(id);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="size-4" /> Parent &amp; Athlete Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Parents and athletes join with this code to follow the schedule,
          results, and announcements on their phone — no password, no account
          setup. They just enter the email on their roster profile.
        </p>

        {loading || !info ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {/* Join code + link */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Team join code
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em]">
                {info.joinCode}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="size-4 mr-1.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 mr-1.5" /> Copy join link
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={busy === "regen"}
                >
                  <RefreshCw
                    className={`size-4 mr-1.5 ${busy === "regen" ? "animate-spin" : ""}`}
                  />
                  New code
                </Button>
              </div>
            </div>

            {/* Email all */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Invite everyone</p>
                <p className="text-xs text-muted-foreground">
                  Emails the join link to all {info.recipientCount} parent/athlete
                  address{info.recipientCount === 1 ? "" : "es"} on the roster.
                </p>
                {emailResult && (
                  <p className="mt-1 text-xs text-foreground">{emailResult}</p>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleEmailAll}
                disabled={busy === "email" || info.recipientCount === 0}
              >
                <Mail className="size-4 mr-1.5" />
                {busy === "email" ? "Sending…" : "Email all"}
              </Button>
            </div>

            {/* Pending join requests */}
            {requests.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Inbox className="size-4" /> Couldn&apos;t be matched (
                  {requests.length})
                </p>
                <p className="text-xs text-muted-foreground">
                  These people tried to join but their email isn&apos;t on any
                  athlete&apos;s profile. Add it on the Roster tab, then dismiss.
                </p>
                <div className="space-y-1.5">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">{r.email}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolve(r.id)}
                      >
                        <Check className="size-4 mr-1" /> Dismiss
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview link */}
            <a
              href="/portal/login"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              <ExternalLink className="size-3" /> Open the portal sign-in page
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}
