"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminInviteAdmin } from "@/lib/actions/admin";

export function InviteAdminButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function reset() {
    setEmail("");
    setName("");
    setMsg(null);
  }

  function handleSubmit() {
    setMsg(null);
    startTransition(async () => {
      const res = await adminInviteAdmin({ email, name: name || undefined });
      if ("error" in res && res.error) {
        setMsg({ type: "error", text: res.error });
        return;
      }
      const mode = "mode" in res ? res.mode : null;
      setMsg({
        type: "success",
        text:
          mode === "promoted"
            ? "Existing user has been promoted to admin."
            : "Invitation email sent. They have 7 days to activate.",
      });
      router.refresh();
      // close after showing the message briefly
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1600);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4 mr-2" /> Invite admin
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a new admin</DialogTitle>
            <DialogDescription>
              If the email is already registered, that user is promoted to admin instead.
              Otherwise an invitation email is sent so they can set their own password.
            </DialogDescription>
          </DialogHeader>
          {msg && (
            <div
              className={`rounded-md border p-3 text-sm flex gap-2 ${
                msg.type === "error"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-success/50 bg-success/10 text-success"
              }`}
            >
              {msg.type === "error" ? (
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-name">
                Name <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="inv-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Chen"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !email}>
              {pending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <UserPlus className="size-4 mr-2" />}
              {pending ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
