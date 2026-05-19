import { Compass } from "lucide-react";
import { redirect } from "next/navigation";
import { ClientNav } from "@/components/client-nav";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireClient } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireClient();

  const client = await db.client.findUnique({
    where: { userId: session.user.id },
    select: { intakeResponse: { select: { id: true } } },
  });

  if (!client?.intakeResponse) {
    redirect("/onboarding/intake");
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Praevio</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <ClientNav />
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
