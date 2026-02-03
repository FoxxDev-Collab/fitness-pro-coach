"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Dumbbell, ClipboardList, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/clients", label: "Clients", icon: User },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/programs", label: "Programs", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex border-b border-border bg-card">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium transition",
              isActive
                ? "bg-muted text-purple-400 border-b-2 border-purple-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon size={18} />
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
