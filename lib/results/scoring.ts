import type { EngineResult } from "./types";

export type TeamScore = {
  complete: boolean;
  score: number | null;
  scorers: EngineResult[];
  displacers: EngineResult[];
  finishers: number;
  packTimeSeconds: number | null;
  spreadSeconds: number | null;
  averageSeconds: number | null;
};

/**
 * XC scoring for ONE group (already filtered to a squad/gender).
 * Finishers ranked by finish `place`; top 5 score, 6th/7th displace.
 */
export function computeTeamScore(groupResults: EngineResult[]): TeamScore {
  const finishers = groupResults
    .filter((r) => !r.dnf && r.place != null)
    .sort((a, b) => a.place! - b.place!);

  const scorers = finishers.slice(0, 5);
  const displacers = finishers.slice(5, 7);
  const complete = scorers.length === 5;

  if (!complete) {
    return {
      complete: false, score: null, scorers, displacers,
      finishers: finishers.length,
      packTimeSeconds: null, spreadSeconds: null, averageSeconds: null,
    };
  }

  const score = scorers.reduce((sum, r) => sum + r.place!, 0);
  const values = scorers.map((r) => r.value);
  const pack = values[values.length - 1] - values[0];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return {
    complete: true, score, scorers, displacers,
    finishers: finishers.length,
    packTimeSeconds: pack, spreadSeconds: pack, averageSeconds: avg,
  };
}
