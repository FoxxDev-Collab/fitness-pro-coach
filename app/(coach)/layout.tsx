import { Dumbbell } from "lucide-react";
import { NavTabs } from "@/components/nav-tabs";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireCoach } from "@/lib/auth-utils";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCoach();

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-foreground" />
            <span className="text-lg font-semibold tracking-tight">FitCoach Pro</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <NavTabs />
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
