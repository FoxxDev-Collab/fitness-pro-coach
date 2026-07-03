import type { Metadata } from "next";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { PortalAuthShell } from "@/components/portal/portal-auth-shell";
import { PortalDashboardView } from "@/components/portal/portal-dashboard-view";
import { getPortalDashboard, portalSignOut } from "@/lib/actions/portal";

export const metadata: Metadata = {
  title: "Your team — Praevio",
};

export default async function PortalPage() {
  const dashboard = await getPortalDashboard();

  if (dashboard.athletes.length === 0) {
    return (
      <PortalAuthShell>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <UserX className="size-6 text-muted-foreground" />
            </div>
            <CardTitle>Nothing linked yet</CardTitle>
            <CardDescription>
              We couldn&apos;t find an athlete linked to <strong>{dashboard.email}</strong>.
              Ask your coach to confirm this email is on the roster, then sign in again.
            </CardDescription>
            <form action={portalSignOut} className="w-full pt-2">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </PortalAuthShell>
    );
  }

  return <PortalDashboardView dashboard={dashboard} />;
}
