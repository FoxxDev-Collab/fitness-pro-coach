import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientTabs } from "./client-tabs";
import { ClientHeaderActions } from "./client-header-actions";
import { getClient } from "@/lib/actions/clients";
import { getClientInviteStatus } from "@/lib/actions/invites";
import { getClientIntakeForCoach } from "@/lib/actions/intake";
import { getClientNotes } from "@/lib/actions/notes";
import { requireCoach } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  const session = await requireCoach();
  const [inviteStatus, notes, coach, intakeResponse] = await Promise.all([
    getClientInviteStatus(id),
    getClientNotes(id),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { waiverText: true },
    }),
    getClientIntakeForCoach(id),
  ]);

  type ClientWithRelations = NonNullable<typeof client>;
  type AssignmentLog = ClientWithRelations["assignments"][number]["logs"][number];

  const clientLogs: AssignmentLog[] = client.assignments
    .flatMap((assignment: ClientWithRelations["assignments"][number]) => assignment.logs)
    .sort((logA: AssignmentLog, logB: AssignmentLog) =>
      new Date(logB.date).getTime() - new Date(logA.date).getTime()
    );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/clients">
          <ArrowLeft className="size-4 mr-1.5" /> All Clients
        </Link>
      </Button>

      <div className="space-y-3 rounded-lg border bg-card px-4 py-3 sm:space-y-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {client.name}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              {client.email}
              {client.phone && ` · ${client.phone}`}
            </p>
          </div>
          <ClientHeaderActions
            client={client}
            hasEmail={!!client.email}
            hasWaiver={!!coach?.waiverText}
            inviteStatus={inviteStatus}
          />
        </div>

        {client.healthConditions && (
          <div className="flex gap-2.5 rounded-md border border-warning/50 bg-warning/10 p-3">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Health Conditions</p>
              <p className="text-sm text-muted-foreground">{client.healthConditions}</p>
            </div>
          </div>
        )}

        <div className="hidden grid-cols-2 gap-4 text-sm sm:grid">
          <div>
            <span className="text-muted-foreground">Goals:</span>{" "}
            {client.goals || "Not set"}
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            <Badge variant={client.active ? "default" : "secondary"}>
              {client.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <ClientTabs
        client={client}
        assignments={client.assignments}
        logs={clientLogs}
        measurements={client.measurements}
        notes={notes}
        intakeResponse={intakeResponse}
      />
    </div>
  );
}
