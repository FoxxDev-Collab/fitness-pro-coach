import Link from "next/link";
import { db } from "@/lib/db";
import { requireCoach } from "@/lib/auth-utils";
import { getSetupProgress } from "@/lib/actions/coach-profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ClipboardList,
  Activity,
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
  Sparkles,
} from "lucide-react";
import { SetupChecklist } from "./setup-checklist";

export default async function CoachDashboardPage() {
  const session = await requireCoach();
  const coachId = session.user.id;
  const firstName = (session.user.name ?? "Coach").split(" ")[0];

  const [setup, stats, recentSessions] = await Promise.all([
    getSetupProgress(),
    getDashboardStats(coachId),
    getRecentSessions(coachId),
  ]);

  const showChecklist =
    !setup.checklistDismissed &&
    !(setup.profileComplete && setup.hasClient && setup.hasProgram && setup.hasAssignment && setup.hasIntakeSlug);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {showChecklist && (
        <SetupChecklist
          profileComplete={setup.profileComplete}
          hasClient={setup.hasClient}
          hasProgram={setup.hasProgram}
          hasAssignment={setup.hasAssignment}
          hasIntakeSlug={setup.hasIntakeSlug}
          intakeSlug={setup.intakeSlug}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="size-4" />}
          label="Active clients"
          value={stats.activeClients}
          href="/clients"
        />
        <StatCard
          icon={<Activity className="size-4" />}
          label="Sessions this week"
          value={stats.sessionsThisWeek}
          accent={stats.sessionsThisWeek > 0}
        />
        <StatCard
          icon={<ClipboardList className="size-4" />}
          label="Programs"
          value={stats.programCount}
          href="/programs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Quick actions</h2>
              <Sparkles className="size-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/clients">
                  <Plus className="size-4 mr-2" /> Add a client
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/programs/new">
                  <Plus className="size-4 mr-2" /> Build a program
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/exercises">
                  <Plus className="size-4 mr-2" /> Browse exercises
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent sessions</h2>
              <TrendingUp className="size-4 text-muted-foreground" />
            </div>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No logged sessions yet. Once a client completes a workout, it&apos;ll appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentSessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/clients/${s.clientId}`}
                      className="flex items-center justify-between gap-3 rounded-md p-2 -mx-2 hover:bg-accent transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.clientName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.programName} · {s.exerciseCount} exercise{s.exerciseCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground font-mono">
                          {relativeTime(s.date)}
                        </span>
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {setup.intakeSlug && (
        <Card className="bg-muted/40 border-dashed">
          <CardContent className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Calendar className="size-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Your public intake URL</p>
                <code className="text-xs text-muted-foreground font-mono truncate block">
                  praevio.fitness/intake/{setup.intakeSlug}
                </code>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">Coming soon</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <Card className={accent ? "border-primary/40" : undefined}>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums mt-1">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}

async function getDashboardStats(coachId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const [activeClients, programCount, sessionsThisWeek] = await Promise.all([
    db.client.count({ where: { coachId, active: true } }),
    db.program.count({ where: { coachId } }),
    db.sessionLog.count({
      where: {
        date: { gte: sevenDaysAgo },
        assignment: { client: { coachId } },
      },
    }),
  ]);
  return { activeClients, programCount, sessionsThisWeek };
}

async function getRecentSessions(coachId: string) {
  const logs = await db.sessionLog.findMany({
    where: { assignment: { client: { coachId } } },
    orderBy: { date: "desc" },
    take: 5,
    select: {
      id: true,
      date: true,
      assignment: {
        select: {
          name: true,
          client: { select: { id: true, name: true } },
        },
      },
      _count: { select: { exercises: true } },
    },
  });
  return logs
    .filter((l) => l.assignment.client)
    .map((l) => ({
      id: l.id,
      date: l.date,
      clientId: l.assignment.client!.id,
      clientName: l.assignment.client!.name,
      programName: l.assignment.name,
      exerciseCount: l._count.exercises,
    }));
}

function relativeTime(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) {
    const hrs = Math.floor(ms / 3600000);
    if (hrs === 0) return "just now";
    return `${hrs}h ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
