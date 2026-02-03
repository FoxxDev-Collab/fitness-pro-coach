import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Trash2, AlertTriangle, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { DeleteClientButton } from "./delete-button";
import { ClientTabs } from "./client-tabs";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await db.client.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          program: true,
          workouts: {
            include: {
              exercises: true,
            },
            orderBy: { order: "asc" },
          },
          logs: {
            include: {
              exercises: {
                include: {
                  setDetails: true,
                },
              },
            },
            orderBy: { date: "desc" },
          },
        },
      },
      measurements: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const clientLogs = client.assignments
    .flatMap((assignment) => assignment.logs)
    .sort((logA, logB) =>
      new Date(logB.date).getTime() - new Date(logA.date).getTime()
    );

  return (
    <div>
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/clients" className="text-purple-400">
          <ArrowLeft size={16} className="mr-1" /> All Clients
        </Link>
      </Button>

      <div className="bg-card rounded-lg p-4 mb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-xl font-bold">{client.name}</h2>
            <p className="text-muted-foreground text-sm">
              {client.email}
              {client.phone && ` · ${client.phone}`}
            </p>
          </div>
          <div className="flex gap-2">
            <ClientFormDialog client={client}>
              <Button variant="outline" size="icon">
                <Edit2 size={16} />
              </Button>
            </ClientFormDialog>
            <DeleteClientButton id={client.id} name={client.name} />
          </div>
        </div>
        {client.healthConditions && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 mb-3 flex gap-2">
            <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
            <div>
              <p className="font-medium text-yellow-400 text-sm">
                Health Conditions
              </p>
              <p className="text-sm">{client.healthConditions}</p>
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
      </div>

      <ClientTabs
        client={client}
        assignments={client.assignments}
        logs={clientLogs}
        measurements={client.measurements}
      />
    </div>
  );
}
