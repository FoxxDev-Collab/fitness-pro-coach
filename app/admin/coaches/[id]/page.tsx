import { getCoachDetail } from "@/lib/actions/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleStatusButton } from "./toggle-status";

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coach = await getCoachDetail(id);
  if (!coach) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/coaches">
          <ArrowLeft className="size-4 mr-1.5" /> All Coaches
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{coach.name || "Unnamed"}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{coach.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Joined {new Date(coach.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={coach.active ? "default" : "secondary"}>
                {coach.active ? "Active" : "Disabled"}
              </Badge>
              <ToggleStatusButton userId={coach.id} active={coach.active} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clients ({coach.clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coach.clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No clients</p>
          ) : (
            <div className="space-y-2">
              {coach.clients.map((client) => (
                <div key={client.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.email || "No email"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{client._count.assignments} programs</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programs ({coach.programs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coach.programs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No programs</p>
          ) : (
            <div className="space-y-2">
              {coach.programs.map((program) => (
                <div key={program.id} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="font-medium text-sm">{program.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {program._count.workouts} workouts · {program._count.assignments} assigned
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
