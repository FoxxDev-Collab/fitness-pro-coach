"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, MoreVertical, Send, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { InviteClientButton } from "@/components/invite-client-button";
import { DeleteClientButton } from "./delete-button";
import { inviteClient } from "@/lib/actions/invites";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  goals: string | null;
  healthConditions: string | null;
  notes: string | null;
  active: boolean;
};

type InviteStatus = "none" | "pending" | "active" | null;

/**
 * Client header actions. Desktop shows them inline; mobile collapses them into a
 * kebab menu (invite / edit / delete) to keep the header card compact. Edit +
 * delete dialogs are rendered once in controlled mode; the invite item mirrors
 * the InviteClientButton states.
 */
export function ClientHeaderActions({
  client,
  hasEmail,
  hasWaiver,
  inviteStatus,
}: {
  client: Client;
  hasEmail: boolean;
  hasWaiver: boolean;
  inviteStatus: InviteStatus;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Derive the invite menu item from the same rules as InviteClientButton.
  let inviteLabel = "Invite to app";
  let inviteDisabled = false;
  let inviteIcon = <Send className="size-4" />;
  if (inviteStatus === "active") {
    inviteLabel = "Account active";
    inviteDisabled = true;
    inviteIcon = <Check className="size-4" />;
  } else if (!hasEmail) {
    inviteLabel = "Add an email to invite";
    inviteDisabled = true;
  } else if (!hasWaiver) {
    inviteLabel = "Add a waiver first";
    inviteDisabled = true;
  } else if (inviteStatus === "pending") {
    inviteLabel = "Resend invite";
  }

  const handleInvite = async () => {
    if (inviteDisabled) return;
    setInviting(true);
    try {
      await inviteClient(client.id);
      router.refresh();
    } catch (err) {
      console.error("Failed to invite:", err);
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      {/* Desktop: inline actions */}
      <div className="hidden flex-wrap justify-end gap-2 sm:flex">
        <InviteClientButton
          clientId={client.id}
          hasEmail={hasEmail}
          hasWaiver={hasWaiver}
          inviteStatus={inviteStatus}
        />
        <Button variant="outline" size="icon" onClick={() => setEditOpen(true)}>
          <Edit2 className="size-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Mobile: overflow menu */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-1">
              <MoreVertical className="size-5" />
              <span className="sr-only">Client actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={inviteDisabled || inviting} onSelect={handleInvite}>
              {inviting ? <Loader2 className="size-4 animate-spin" /> : inviteIcon}
              {inviteLabel}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Edit2 className="size-4" /> Edit client
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> Delete client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Controlled dialogs (rendered once, no internal triggers) */}
      <ClientFormDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteClientButton
        id={client.id}
        name={client.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
