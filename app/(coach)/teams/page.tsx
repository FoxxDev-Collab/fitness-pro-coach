import { getTeams } from "@/lib/actions/teams";
import Link from "next/link";
import { Plus, UsersRound, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TeamFormDialog } from "./team-form-dialog";

export default async function TeamsPage() {
  const teams = await getTeams();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">{teams.length} total</p>
        </div>
        <TeamFormDialog>
          <Button>
            <Plus className="size-4 mr-2" />
            Add Team
          </Button>
        </TeamFormDialog>
      </div>

      {teams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersRound className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No teams yet</p>
            <TeamFormDialog>
              <Button>
                <Plus className="size-4 mr-2" />
                Create Your First Team
              </Button>
            </TeamFormDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/teams/${t.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent block"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {t.sport && `${t.sport} · `}
                  {t._count.athletes} athlete{t._count.athletes !== 1 ? "s" : ""}
                  {" · "}
                  {t._count.teamAssignments} program{t._count.teamAssignments !== 1 ? "s" : ""}
                </p>
                {t.events[0] && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="size-3" />
                    Next: {t.events[0].title} &mdash;{" "}
                    {new Date(t.events[0].startTime).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <Badge variant={t.active ? "default" : "secondary"}>
                  {t.active ? "Active" : "Inactive"}
                </Badge>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
