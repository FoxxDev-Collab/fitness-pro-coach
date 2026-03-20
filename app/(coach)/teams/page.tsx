import { getTeams } from "@/lib/actions/teams";
import Link from "next/link";
import { Plus, UsersRound, ChevronRight, Calendar, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TeamFormDialog } from "./team-form-dialog";

export default async function TeamsPage() {
  const teams = await getTeams();

  const activeTeams = teams.filter((t) => !t.archivedAt);
  const archivedTeams = teams.filter((t) => t.archivedAt);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">
            {activeTeams.length} active
            {archivedTeams.length > 0 && ` · ${archivedTeams.length} archived`}
          </p>
        </div>
        <TeamFormDialog>
          <Button>
            <Plus className="size-4 mr-2" />
            Add Team
          </Button>
        </TeamFormDialog>
      </div>

      {activeTeams.length === 0 && archivedTeams.length === 0 ? (
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
        <>
          {activeTeams.length > 0 && (
            <div className="space-y-2">
              {activeTeams.map((t) => (
                <TeamCard key={t.id} team={t} />
              ))}
            </div>
          )}

          {archivedTeams.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Archive className="size-4" />
                <p className="text-sm font-medium">Archived ({archivedTeams.length})</p>
              </div>
              <div className="space-y-2 opacity-70">
                {archivedTeams.map((t) => (
                  <TeamCard key={t.id} team={t} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type TeamCardProps = {
  team: Awaited<ReturnType<typeof getTeams>>[number];
};

function TeamCard({ team: t }: TeamCardProps) {
  return (
    <Link
      href={`/teams/${t.id}`}
      className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent block"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{t.name}</p>
          {t.season && (
            <span className="text-xs text-muted-foreground">({t.season})</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {t.sport && `${t.sport} · `}
          {t._count.athletes} athlete{t._count.athletes !== 1 ? "s" : ""}
          {" · "}
          {t._count.teamAssignments} program{t._count.teamAssignments !== 1 ? "s" : ""}
        </p>
        {!t.archivedAt && t.events[0] && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="size-3" />
            Next: {t.events[0].title} &mdash;{" "}
            {new Date(t.events[0].startTime).toLocaleDateString()}
          </p>
        )}
        {t.archivedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Archived {new Date(t.archivedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 ml-4">
        <Badge variant={t.archivedAt ? "secondary" : t.active ? "default" : "secondary"}>
          {t.archivedAt ? "Archived" : t.active ? "Active" : "Inactive"}
        </Badge>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
