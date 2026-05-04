import Link from "next/link";
import { getPlatformStats, listAuditLog } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, ShieldCheck, UsersRound, Activity, Sparkles, History } from "lucide-react";

export default async function AdminDashboard() {
  const stats = await getPlatformStats();
  const auditResult = await listAuditLog({ pageSize: 10 });
  const recentAudit = "error" in auditResult ? [] : auditResult.items;

  const statCards = [
    { label: "Coaches", value: stats.coaches, icon: UserCheck, href: "/admin/coaches" },
    { label: "Admins", value: stats.admins, icon: ShieldCheck, href: "/admin/admins" },
    { label: "Clients", value: stats.clients, icon: Users, href: "/admin/clients" },
    { label: "Teams", value: stats.teams, icon: UsersRound, href: "/admin/teams" },
    { label: "Sessions (7d)", value: stats.recentSessions, icon: Activity },
    { label: "Onboarded", value: stats.onboardedCoaches, icon: Sparkles, hint: `of ${stats.coaches} coaches` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => {
          const inner = (
            <Card className="h-full">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs uppercase tracking-wider font-medium">{s.label}</span>
                  <s.icon className="size-3.5" />
                </div>
                <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                {s.hint && <p className="text-xs text-muted-foreground">{s.hint}</p>}
              </CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="transition-opacity hover:opacity-90">
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent admin activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Last {recentAudit.length} entries</p>
          </div>
          <Link href="/admin/audit" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <History className="size-3.5" /> Full audit log
          </Link>
        </CardHeader>
        <CardContent>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
          ) : (
            <ul className="divide-y -my-2">
              {recentAudit.map((a) => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-muted-foreground">{a.action}</span>
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="truncate">{a.actorEmail || "system"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {relativeTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function relativeTime(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
