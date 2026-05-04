"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, UsersRound, Dumbbell, ClipboardList, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/teams", label: "Teams", icon: UsersRound },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/programs", label: "Programs", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="max-w-5xl mx-auto flex px-4">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="size-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
