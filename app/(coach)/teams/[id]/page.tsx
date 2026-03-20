import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamFormDialog } from "../team-form-dialog";
import { DeleteTeamButton } from "./delete-button";
import { TeamTabs } from "./team-tabs";
import { getTeam } from "@/lib/actions/teams";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeam(id);

  if (!team) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teams">
          <ArrowLeft className="size-4 mr-1.5" /> All Teams
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{team.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {team.sport && `${team.sport}`}
                {team.sport && team.season && " · "}
                {team.season && team.season}
                {!team.sport && !team.season && "No sport or season set"}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <TeamFormDialog team={team}>
                <Button variant="outline" size="icon">
                  <Edit2 className="size-4" />
                </Button>
              </TeamFormDialog>
              <DeleteTeamButton id={team.id} name={team.name} />
            </div>
          </div>
        </CardHeader>
        {team.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{team.description}</p>
          </CardContent>
        )}
      </Card>

      <TeamTabs team={team} />
    </div>
  );
}
