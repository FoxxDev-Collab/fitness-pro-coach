import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { DeleteClientButton } from "./delete-button";
import { ClientTabs } from "./client-tabs";
import { InviteClientButton } from "@/components/invite-client-button";
import { getClient } from "@/lib/actions/clients";
import { getClientInviteStatus } from "@/lib/actions/invites";
import { getClientNotes } from "@/lib/actions/notes";

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

  const [inviteStatus, notes] = await Promise.all([
    getClientInviteStatus(id),
    getClientNotes(id),
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

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{client.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {client.email}
                {client.phone && ` · ${client.phone}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <InviteClientButton
                clientId={client.id}
                hasEmail={!!client.email}
                inviteStatus={inviteStatus}
              />
              <ClientFormDialog client={client}>
                <Button variant="outline" size="icon">
                  <Edit2 className="size-4" />
                </Button>
              </ClientFormDialog>
              <DeleteClientButton id={client.id} name={client.name} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {client.healthConditions && (
            <div className="rounded-md border border-warning/50 bg-warning/10 p-3 flex gap-2.5">
              <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Health Conditions</p>
                <p className="text-sm text-muted-foreground">{client.healthConditions}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
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
        </CardContent>
      </Card>

      <ClientTabs
        client={client}
        assignments={client.assignments}
        logs={clientLogs}
        measurements={client.measurements}
        notes={notes}
      />
    </div>
  );
}
