import Link from "next/link";
import { ShieldAlert, LogOut } from "lucide-react";
import { getEffectiveSession } from "@/lib/auth-utils";
import { stopImpersonation } from "@/lib/actions/impersonation";

export async function ImpersonationBanner() {
  const session = await getEffectiveSession();
  if (!session?.impersonation) return null;

  const targetLabel = session.user.email || session.user.name || "user";
  const adminLabel = session.impersonation.adminEmail || "admin";

  return (
    <div className="sticky top-0 z-[60] bg-warning text-warning-foreground border-b border-warning-foreground/10">
      <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="size-4 shrink-0" />
          <span className="font-medium">Viewing as {targetLabel}</span>
          <span className="opacity-80 hidden sm:inline">— signed in as {adminLabel}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/dashboard"
            className="text-xs underline underline-offset-4 hover:opacity-80"
          >
            Admin
          </Link>
          <form action={stopImpersonation}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-warning-foreground/10 hover:bg-warning-foreground/20 px-2.5 py-1 rounded-md transition-colors"
            >
              <LogOut className="size-3.5" />
              Exit impersonation
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
