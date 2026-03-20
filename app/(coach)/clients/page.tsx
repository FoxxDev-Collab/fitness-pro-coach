import { getClients } from "@/lib/actions/clients";
import Link from "next/link";
import { Plus, Users, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { cn } from "@/lib/utils";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">{clients.length} total</p>
        </div>
        <ClientFormDialog>
          <Button>
            <Plus className="size-4 mr-2" />
            Add Client
          </Button>
        </ClientFormDialog>
      </div>

      {clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No clients yet</p>
            <ClientFormDialog>
              <Button>
                <Plus className="size-4 mr-2" />
                Add Your First Client
              </Button>
            </ClientFormDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => {
            const allLogs = c.assignments.flatMap((a) => a.logs);
            const totalSessions = allLogs.length;
            const lastSession = allLogs[0]?.date;
            const recentCount = allLogs.filter(
              (l) => Date.now() - new Date(l.date).getTime() < 7 * 86400000
            ).length;

            const daysAgo = lastSession
              ? Math.round((Date.now() - new Date(lastSession).getTime()) / 86400000)
              : null;
            const lastLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : daysAgo !== null ? `${daysAgo}d ago` : null;

            return (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent block"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "size-2 rounded-full shrink-0",
                      recentCount >= 3 ? "bg-success" : recentCount > 0 ? "bg-warning" : "bg-destructive"
                    )} />
                    <p className="font-medium">{c.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate ml-4">
                    {totalSessions} session{totalSessions !== 1 ? "s" : ""}
                    {lastLabel && <> · Last: {lastLabel}</>}
                    {recentCount > 0 && <> · {recentCount} this week</>}
                    {" · "}{c._count.assignments} program{c._count.assignments !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {c.healthConditions && (
                    <AlertTriangle className="size-4 text-warning" />
                  )}
                  <Badge variant={c.active ? "default" : "secondary"}>
                    {c.active ? "Active" : "Inactive"}
                  </Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
