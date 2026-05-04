"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const initials = (session.user.name || session.user.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <span className="size-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{session.user.name || "User"}</p>
          <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
        </div>
        <DropdownMenuSeparator />
        {session.user.role === "COACH" && (
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="size-4 mr-2" />
              Settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="size-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
