"use client";

import { useState } from "react";
import { Send, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteClient } from "@/lib/actions/invites";

export function InviteClientButton({
  clientId,
  hasEmail,
  inviteStatus,
}: {
  clientId: string;
  hasEmail: boolean;
  inviteStatus: "none" | "pending" | "active" | null;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (inviteStatus === "active") {
    return (
      <Button variant="outline" size="sm" disabled>
        <Check className="size-4 mr-1.5" />
        Account Active
      </Button>
    );
  }

  if (!hasEmail) {
    return (
      <Button variant="outline" size="sm" disabled title="Add client email first">
        <Send className="size-4 mr-1.5" />
        No email
      </Button>
    );
  }

  async function handleInvite() {
    setLoading(true);
    try {
      await inviteClient(clientId);
      setSent(true);
    } catch (err) {
      console.error("Failed to invite:", err);
    } finally {
      setLoading(false);
    }
  }

  if (sent || inviteStatus === "pending") {
    return (
      <Button variant="outline" size="sm" onClick={handleInvite} disabled={loading}>
        {loading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
        {sent ? "Resend Invite" : "Resend"}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleInvite} disabled={loading}>
      {loading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Send className="size-4 mr-1.5" />}
      Invite to App
    </Button>
  );
}
