import { Dumbbell, Shield } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAdmin } from "@/lib/auth-utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-5 text-foreground" />
            <span className="text-lg font-semibold tracking-tight">FitCoach Pro</span>
            <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
              <Shield className="size-3" /> Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
