"use client";

import { useState } from "react";
import { Edit2, RefreshCw, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RolloverDialog } from "./rollover-dialog";
import { TeamFormDialog } from "../team-form-dialog";
import { DeleteTeamButton } from "./delete-button";

type Team = {
  id: string;
  name: string;
  sport: string | null;
  season: string | null;
  description: string | null;
  archivedAt: Date | null;
};

/**
 * Team header actions. On desktop the actions sit inline as buttons; on mobile
 * they collapse into an overflow (kebab) menu to keep the header card compact.
 * The dialogs are rendered once in controlled mode so both surfaces drive them.
 */
export function TeamHeaderActions({ team }: { team: Team }) {
  const [rolloverOpen, setRolloverOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canRollover = !team.archivedAt;

  return (
    <>
      {/* Desktop: inline buttons */}
      <div className="hidden gap-2 sm:flex">
        {canRollover && (
          <Button variant="outline" size="sm" onClick={() => setRolloverOpen(true)}>
            <RefreshCw className="size-4 mr-1.5" /> New Season
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => setEditOpen(true)}>
          <Edit2 className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Mobile: overflow menu */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-1">
              <MoreVertical className="size-5" />
              <span className="sr-only">Team actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canRollover && (
              <DropdownMenuItem onSelect={() => setRolloverOpen(true)}>
                <RefreshCw className="size-4" /> New Season
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Edit2 className="size-4" /> Edit team
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" /> Delete team
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Controlled dialogs (rendered once, no internal triggers) */}
      {canRollover && (
        <RolloverDialog
          teamId={team.id}
          teamName={team.name}
          teamSport={team.sport}
          open={rolloverOpen}
          onOpenChange={setRolloverOpen}
        />
      )}
      <TeamFormDialog team={team} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteTeamButton
        id={team.id}
        name={team.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
