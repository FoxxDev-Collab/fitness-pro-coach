"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdherenceSummary, ClientAdherence } from "@/lib/actions/adherence";

function daysAgo(date: Date | null): string {
  if (!date) return "Never";
  const days = Math.round((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function statusColor(client: ClientAdherence): string {
  if (client.sessionsThisWeek >= 3) return "bg-success";
  if (client.sessionsThisWeek > 0) return "bg-warning";
  if (client.lastSessionDate) {
    const days = Math.round(
      (Date.now() - new Date(client.lastSessionDate).getTime()) / 86400000
    );
    if (days <= 14) return "bg-warning";
  }
  return "bg-destructive";
}

export function AdherenceView({ data }: { data: AdherenceSummary }) {
  const stats = [
    { label: "Active Clients", value: data.totalActive },
    { label: "Active This Week", value: data.activeThisWeek },
    { label: "Avg Sessions/Week", value: data.avgSessionsPerWeek },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        {data.clients.map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent block"
          >
            <div className="flex items-center gap-3">
              <div className={cn("size-2.5 rounded-full shrink-0", statusColor(client))} />
              <div>
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-muted-foreground">
                  Last: {daysAgo(client.lastSessionDate)} · {client.sessionsThisWeek} this week · {client.sessionsThisMonth} this month
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              {client.streak > 0 && (
                <p className="text-sm font-medium tabular-nums">
                  {client.streak}w streak
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {client.assignmentCount} programs
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
