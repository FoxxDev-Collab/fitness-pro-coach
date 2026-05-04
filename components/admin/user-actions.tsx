"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Mail, KeyRound, ShieldCheck, ShieldOff, Trash2, Eye, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  toggleUserStatus,
  adminResetPassword,
  adminPromoteToAdmin,
  adminDemoteToCoach,
  adminDeleteUser,
} from "@/lib/actions/admin";
import { startImpersonation } from "@/lib/actions/impersonation";

type Props = {
  userId: string;
  userEmail: string;
  userName: string | null;
  role: "ADMIN" | "COACH" | "CLIENT";
  active: boolean;
  canImpersonate?: boolean;
};

type Confirm =
  | null
  | {
      kind: "toggle" | "reset" | "promote" | "demote" | "delete";
      title: string;
      body: string;
      destructive?: boolean;
      confirmLabel: string;
      run: () => Promise<{ error?: string; success?: boolean }>;
    };

export function UserActionsMenu(props: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function ask(c: Confirm) {
    setError(null);
    setConfirm(c);
  }

  function execute() {
    if (!confirm) return;
    startTransition(async () => {
      const res = await confirm.run();
      if (res?.error) {
        setError(res.error);
        return;
      }
      setConfirm(null);
      router.refresh();
    });
  }

  function impersonate() {
    setError(null);
    startTransition(async () => {
      const res = await startImpersonation({ userId: props.userId });
      // startImpersonation redirects on success; only an error returns here
      if (res && "error" in res && res.error) setError(res.error);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="User actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {props.canImpersonate && props.role !== "ADMIN" && props.active && (
            <>
              <DropdownMenuItem onClick={impersonate} disabled={pending}>
                <Eye className="size-4 mr-2" /> Impersonate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() =>
              ask({
                kind: "reset",
                title: "Send password reset email?",
                body: `An email with a 1-hour reset link will be sent to ${props.userEmail}.`,
                confirmLabel: "Send reset email",
                run: () => adminResetPassword(props.userId),
              })
            }
          >
            <KeyRound className="size-4 mr-2" /> Send password reset
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              ask({
                kind: "toggle",
                title: props.active ? "Disable account?" : "Enable account?",
                body: props.active
                  ? `${props.userEmail} will not be able to log in until re-enabled.`
                  : `${props.userEmail} will regain login access.`,
                confirmLabel: props.active ? "Disable" : "Enable",
                destructive: props.active,
                run: () => toggleUserStatus(props.userId),
              })
            }
          >
            {props.active ? (
              <>
                <ShieldOff className="size-4 mr-2" /> Disable account
              </>
            ) : (
              <>
                <ShieldCheck className="size-4 mr-2" /> Enable account
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {props.role !== "ADMIN" ? (
            <DropdownMenuItem
              onClick={() =>
                ask({
                  kind: "promote",
                  title: "Promote to admin?",
                  body: `${props.userEmail} will gain full administrative access. They keep all existing data.`,
                  confirmLabel: "Promote",
                  run: () => adminPromoteToAdmin(props.userId),
                })
              }
            >
              <ShieldCheck className="size-4 mr-2" /> Promote to admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                ask({
                  kind: "demote",
                  title: "Demote to coach?",
                  body: `${props.userEmail} will lose admin privileges and become a regular coach.`,
                  confirmLabel: "Demote",
                  destructive: true,
                  run: () => adminDemoteToCoach(props.userId),
                })
              }
            >
              <ShieldOff className="size-4 mr-2" /> Demote to coach
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() =>
              ask({
                kind: "delete",
                title: "Delete user permanently?",
                body: `This permanently deletes ${props.userEmail} and all of their data (clients, programs, sessions). This cannot be undone.`,
                confirmLabel: "Delete permanently",
                destructive: true,
                run: () => adminDeleteUser(props.userId),
              })
            }
          >
            <Trash2 className="size-4 mr-2" /> Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>{confirm.title}</DialogTitle>
                <DialogDescription>{confirm.body}</DialogDescription>
              </DialogHeader>
              {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirm(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button
                  variant={confirm.destructive ? "destructive" : "default"}
                  onClick={execute}
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Working...
                    </>
                  ) : (
                    confirm.confirmLabel
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ResendVerificationButton({ userEmail }: { userEmail: string }) {
  // Future: call adminResendVerification — placeholder hint for admins
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={`mailto:${userEmail}`}>
        <Mail className="size-3.5 mr-1.5" /> Email
      </a>
    </Button>
  );
}
