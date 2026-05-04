import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTeamDetailAdmin } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminTeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeamDetailAdmin(id);
  if (!team) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/teams">
          <ArrowLeft className="size-4 mr-1.5" /> All teams
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-xl">{team.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {team.sport || "No sport"}
                {team.season && <> · {team.season}</>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Coach:{" "}
                {team.coach ? (
                  <Link href={`/admin/coaches/${team.coach.id}`} className="hover:text-foreground underline-offset-4 hover:underline">
                    {team.coach.name || team.coach.email}
                  </Link>
                ) : (
                  "Unassigned"
                )}
              </p>
            </div>
            <Badge variant={team.active ? "default" : "secondary"}>
              {team.active ? "Active" : "Archived"}
            </Badge>
          </div>
        </CardHeader>
        {team.description && (
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{team.description}</p>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Athletes" value={team.athletes.length} />
        <StatBox label="Team programs" value={team._count.teamAssignments} />
        <StatBox label="Events" value={team._count.events} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Athletes ({team.athletes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {team.athletes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No athletes</p>
          ) : (
            <div className="space-y-2">
              {team.athletes.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {a.name}
                      {!a.active && <Badge variant="secondary">Inactive</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.position || "No position"}
                      {a.jerseyNumber && <> · #{a.jerseyNumber}</>}
                      {a.email && <> · {a.email}</>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="text-center">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}
