import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamHeaderActions } from "./team-header-actions";
import { TeamTabs } from "./team-tabs";
import { getTeam, getTeamDashboard } from "@/lib/actions/teams";
import { getTeamNotes } from "@/lib/actions/team-notes";
import { getMetricDefinitions, getMetricEntries } from "@/lib/actions/metrics";
import {
  ensureDefaultDisciplines,
  getTeamResultsOverview,
} from "@/lib/actions/results";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [team, dashboard, notes, metricDefinitions] = await Promise.all([
    getTeam(id),
    getTeamDashboard(id),
    getTeamNotes(id),
    getMetricDefinitions(),
  ]);

  if (!team) {
    notFound();
  }

  const [teamMetricEntries, athleteMetricEntries] = await Promise.all([
    getMetricEntries({ teamId: id }),
    Promise.all(
      team.athletes.map((a) => getMetricEntries({ athleteId: a.id }))
    ).then((results) => results.flat()),
  ]);

  await ensureDefaultDisciplines();
  const results = await getTeamResultsOverview(id);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/teams">
          <ArrowLeft className="size-4 mr-1.5" /> All Teams
        </Link>
      </Button>

      <div className="rounded-lg border bg-card px-4 py-3 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold sm:text-xl">
              {team.name}
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              {team.sport && `${team.sport}`}
              {team.sport && team.season && " · "}
              {team.season && team.season}
              {!team.sport && !team.season && "No sport or season set"}
            </p>
          </div>
          <TeamHeaderActions team={team} />
        </div>
        {team.description && (
          <p className="mt-3 hidden text-sm text-muted-foreground sm:block">
            {team.description}
          </p>
        )}
      </div>

      <TeamTabs
        team={{ ...team, notes }}
        dashboard={dashboard}
        notes={notes}
        metricDefinitions={metricDefinitions}
        teamMetricEntries={teamMetricEntries}
        athleteMetricEntries={athleteMetricEntries}
        results={results}
      />
    </div>
  );
}
