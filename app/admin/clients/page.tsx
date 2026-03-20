import { getAllClients } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";

export default async function AdminClientsPage() {
  const clients = await getAllClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">All Clients</h1>
        <p className="text-sm text-muted-foreground">{clients.length} across all coaches</p>
      </div>

      <div className="space-y-2">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{client.name}</p>
                {client.userId && <Badge variant="secondary">Has account</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {client.email || "No email"} · Coach: {client.coach?.name || client.coach?.email || "Unknown"}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{client._count.assignments} programs</p>
              <p>Joined {new Date(client.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
