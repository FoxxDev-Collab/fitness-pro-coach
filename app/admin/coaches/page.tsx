import { getCoaches } from "@/lib/actions/admin";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function AdminCoachesPage() {
  const coaches = await getCoaches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coaches</h1>
        <p className="text-sm text-muted-foreground">{coaches.length} total</p>
      </div>

      <div className="space-y-2">
        {coaches.map((coach) => (
          <Link
            key={coach.id}
            href={`/admin/coaches/${coach.id}`}
            className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent block"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{coach.name || "Unnamed"}</p>
                <Badge variant={coach.active ? "default" : "secondary"}>
                  {coach.active ? "Active" : "Disabled"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{coach.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-xs text-muted-foreground">
                <p>{coach._count.clients} clients</p>
                <p>{coach._count.programs} programs</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
