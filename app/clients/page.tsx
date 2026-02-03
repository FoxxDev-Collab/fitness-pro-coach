import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, User, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientFormDialog } from "@/components/client-form-dialog";

export default async function ClientsPage() {
  const clients: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    goals: string | null;
    healthConditions: string | null;
    notes: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: { assignments: number };
  }> = await db.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{clients.length} Clients</h2>
        <ClientFormDialog>
          <Button>
            <Plus size={18} className="mr-2" />
            Add Client
          </Button>
        </ClientFormDialog>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border-2 border-dashed border-border">
          <User size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No clients yet</p>
          <ClientFormDialog>
            <Button>
              <Plus size={18} className="mr-2" />
              Add Your First Client
            </Button>
          </ClientFormDialog>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="bg-card rounded-lg p-4 flex justify-between items-center cursor-pointer hover:border-purple-500/50 border border-transparent transition block"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {c.goals || "No goals"} · {c._count.assignments} program
                  {c._count.assignments !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {c.healthConditions && (
                  <AlertTriangle className="text-yellow-500" size={18} />
                )}
                <Badge variant={c.active ? "default" : "secondary"}>
                  {c.active ? "Active" : "Inactive"}
                </Badge>
                <ChevronRight className="text-muted-foreground" size={18} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
