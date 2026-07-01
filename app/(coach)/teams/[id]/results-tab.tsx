"use client";

import { Timer, Settings2, Trophy, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MeetResultsDialog,
  DisciplineManagerDialog,
  OpponentScoresDialog,
  type DisciplineDTO,
} from "./meet-results-entry";
import { seasonBests, bestOf } from "@/lib/results/records";
import { computeTeamScore } from "@/lib/results/scoring";
import { formatValue, formatTime } from "@/lib/results/format";
import { ResultTrendChart } from "@/components/charts/result-trend-chart";
import type { EngineResult, UnitType, Direction } from "@/lib/results/types";

export type RaceRow = {
  id: string;
  athleteId: string;
  disciplineId: string;
  eventId: string;
  value: number;
  place: number | null;
  squad: string | null;
  dnf: boolean;
  event: { id: string; title: string; startTime: string | Date; type: string };
  athlete: { id: string; name: string; gender: string | null };
  discipline: { id: string; name: string; unitType: UnitType; direction: Direction };
};

export type MeetRow = { id: string; title: string; startTime: string | Date; type: string };
export type OpponentScoreRow = {
  id: string;
  eventId: string;
  groupLabel: string;
  opponentName: string;
  score: number;
};

function toEngine(r: RaceRow): EngineResult {
  return {
    id: r.id,
    athleteId: r.athleteId,
    disciplineId: r.disciplineId,
    eventId: r.eventId,
    value: r.value,
    place: r.place,
    squad: r.squad,
    gender: r.athlete.gender,
    dnf: r.dnf,
    date: new Date(r.event.startTime),
  };
}

function genderLabel(gender: string | null): string {
  if (!gender) return "";
  const g = gender.trim().toLowerCase();
  if (g.startsWith("m")) return "Boys";
  if (g.startsWith("f") || g.startsWith("w") || g.startsWith("g")) return "Girls";
  return gender;
}

function groupLabel(squad: string | null, gender: string | null): string {
  const gl = genderLabel(gender);
  return [squad ?? "Squad", gl].filter(Boolean).join(" ");
}

export function ResultsTab({
  teamId,
  disciplines,
  rows,
  meets,
  opponentScores,
}: {
  teamId: string;
  disciplines: DisciplineDTO[];
  rows: RaceRow[];
  meets: MeetRow[];
  opponentScores: OpponentScoreRow[];
}) {
  const athleteName = new Map(rows.map((r) => [r.athleteId, r.athlete.name]));

  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} result{rows.length !== 1 ? "s" : ""} ·{" "}
          {meets.length} meet{meets.length !== 1 ? "s" : ""}
        </p>
        <DisciplineManagerDialog disciplines={disciplines}>
          <Button size="sm" variant="outline">
            <Settings2 className="size-4 mr-1.5" /> Disciplines
          </Button>
        </DisciplineManagerDialog>
      </div>

      {/* ── PR / Record board ─────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Trophy className="size-4" /> Season Records
        </h3>
        {rows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No results yet. Add a meet on the Schedule tab, then enter results below.
            </CardContent>
          </Card>
        ) : (
          disciplines.map((d) => {
            const dRows = rows.filter((r) => r.disciplineId === d.id && !r.dnf);
            if (dRows.length === 0) return null;
            const bests = seasonBests(dRows.map(toEngine), d.direction);
            const ranked = [...bests.values()].sort((a, b) =>
              d.direction === "LOWER_BETTER" ? a.value - b.value : b.value - a.value,
            );
            return (
              <Card key={d.id}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-sm font-medium mb-2">{d.name}</p>
                  <div className="space-y-1">
                    {ranked.map((b, i) => (
                      <div key={b.athleteId} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <span className="min-w-0 flex-1 truncate">
                          {athleteName.get(b.athleteId) ?? "—"}
                        </span>
                        <span className="font-mono font-medium">
                          {formatValue(b.value, d.unitType)}
                        </span>
                        {i === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Team best
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Meets & scoring ───────────────────────────────── */}
      {meets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Timer className="size-4" /> Meets
          </h3>
          {meets.map((meet) => {
            const meetRows = rows.filter((r) => r.eventId === meet.id);
            // Group by squad × gender, then by discipline within each group.
            const groups = new Map<string, RaceRow[]>();
            for (const r of meetRows) {
              const key = groupLabel(r.squad, r.athlete.gender);
              const arr = groups.get(key);
              if (arr) arr.push(r);
              else groups.set(key, [r]);
            }
            const meetOpp = opponentScores.filter((o) => o.eventId === meet.id);

            return (
              <Card key={meet.id}>
                <CardContent className="pt-4 pb-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{meet.title}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(meet.startTime)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <OpponentScoresDialog eventId={meet.id} existing={meetOpp}>
                        <Button size="sm" variant="ghost">
                          <MapPin className="size-4 mr-1" /> Opponents
                        </Button>
                      </OpponentScoresDialog>
                      <MeetResultsDialog eventId={meet.id} disciplines={disciplines}>
                        <Button size="sm" variant="outline">
                          {meetRows.length > 0 ? "Edit Results" : "Enter Results"}
                        </Button>
                      </MeetResultsDialog>
                    </div>
                  </div>

                  {meetRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No results recorded.</p>
                  ) : (
                    [...groups.entries()].map(([label, gRows]) => {
                      const score = computeTeamScore(gRows.map(toEngine));
                      const opp = meetOpp.find((o) => o.groupLabel === label);
                      const won =
                        score.complete && score.score != null && opp
                          ? score.score < opp.score
                          : null;
                      return (
                        <div key={label} className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{label}</span>
                            {score.complete && score.score != null ? (
                              <span className="text-sm">
                                Score <span className="font-bold">{score.score}</span>
                                {opp && (
                                  <>
                                    {" "}
                                    vs {opp.opponentName} {opp.score}{" "}
                                    {won != null && (
                                      <Badge
                                        variant={won ? "default" : "secondary"}
                                        className="text-xs"
                                      >
                                        {won ? "W" : "L"}
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Incomplete team ({score.finishers}/5)
                              </span>
                            )}
                          </div>
                          {score.complete && (
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              <span>
                                Scorers: {score.scorers.map((s) => s.place).join(", ")}
                              </span>
                              {score.displacers.length > 0 && (
                                <span>
                                  Displacers: {score.displacers.map((s) => s.place).join(", ")}
                                </span>
                              )}
                              {score.packTimeSeconds != null && (
                                <span>Pack: {formatTime(score.packTimeSeconds)}</span>
                              )}
                              {score.averageSeconds != null && (
                                <span>Avg: {formatTime(score.averageSeconds)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Athlete Races (roster detail panel) ────────────────────

export function AthleteRaces({ rows }: { rows: RaceRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No race results yet.</p>
    );
  }

  // Group this athlete's results by discipline.
  const byDiscipline = new Map<string, RaceRow[]>();
  for (const r of rows) {
    const arr = byDiscipline.get(r.disciplineId);
    if (arr) arr.push(r);
    else byDiscipline.set(r.disciplineId, [r]);
  }

  return (
    <div className="space-y-4">
      {[...byDiscipline.values()].map((dRows) => {
        const d = dRows[0].discipline;
        const valid = dRows.filter((r) => !r.dnf);
        const best = bestOf(valid.map(toEngine), d.direction);
        const chartData = [...valid]
          .sort(
            (a, b) =>
              new Date(a.event.startTime).getTime() - new Date(b.event.startTime).getTime(),
          )
          .map((r) => ({
            date: new Date(r.event.startTime).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            value: r.value,
          }));

        return (
          <div key={d.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{d.name}</span>
              {best && (
                <span className="text-sm font-mono">
                  PR {formatValue(best.value, d.unitType)}
                </span>
              )}
            </div>
            <ResultTrendChart
              title={`${d.name} progression`}
              unitType={d.unitType}
              direction={d.direction}
              data={chartData}
              height={140}
            />
          </div>
        );
      })}
    </div>
  );
}
