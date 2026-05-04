import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getClientDetailAdmin } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientDetailAdmin(id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/clients">
          <ArrowLeft className="size-4 mr-1.5" /> All clients
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-xl">{client.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{client.email || "No email"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Coach:{" "}
                {client.coach ? (
                  <Link href={`/admin/coaches/${client.coach.id}`} className="hover:text-foreground underline-offset-4 hover:underline">
                    {client.coach.name || client.coach.email}
                  </Link>
                ) : (
                  "Unassigned"
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={client.active ? "default" : "secondary"}>
                {client.active ? "Active" : "Inactive"}
              </Badge>
              {client.userId && <Badge variant="outline">Has account</Badge>}
              {client.healthConditions && (
                <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
                  <AlertTriangle className="size-3" /> Health flags
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <Field label="Phone" value={client.phone} />
          <Field label="Gender" value={client.gender} />
          <div className="sm:col-span-2"><Field label="Goals" value={client.goals} multiline /></div>
          <div className="sm:col-span-2"><Field label="Health conditions" value={client.healthConditions} multiline /></div>
          <div className="sm:col-span-2"><Field label="Notes" value={client.notes} multiline /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignments ({client.assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {client.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No programs assigned</p>
          ) : (
            <div className="space-y-2">
              {client.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.program?.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {a._count.workouts} workouts · {a._count.logs} logged
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {client.measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y -my-2">
              {client.measurements.map((m) => (
                <li key={m.id} className="py-2 text-sm flex items-center justify-between">
                  <span>{new Date(m.date).toLocaleDateString()}</span>
                  <span className="text-muted-foreground tabular-nums">{m.weight ? `${m.weight} lbs` : "—"}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, multiline }: { label: string; value: string | null | undefined; multiline?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      {value ? (
        <p className={`text-sm mt-1 ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
      ) : (
        <p className="text-sm mt-1 text-muted-foreground italic">Not set</p>
      )}
    </div>
  );
}
