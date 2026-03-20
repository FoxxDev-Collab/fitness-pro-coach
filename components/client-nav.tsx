"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function ClientNav() {
  const pathname = usePathname();

  return (
    <nav className="max-w-5xl mx-auto flex px-4">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
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
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
