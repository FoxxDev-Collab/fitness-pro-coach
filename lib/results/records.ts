import type { EngineResult, Direction } from "./types";

export function bestOf(results: EngineResult[], dir: Direction): EngineResult | null {
  const valid = results.filter((r) => !r.dnf);
  if (valid.length === 0) return null;
  return valid.reduce((best, r) =>
    dir === "LOWER_BETTER"
      ? r.value < best.value ? r : best
      : r.value > best.value ? r : best,
  );
}

const key = (r: EngineResult) => `${r.athleteId}|${r.disciplineId}`;

export function seasonBests(results: EngineResult[], dir: Direction): Map<string, EngineResult> {
  const groups = new Map<string, EngineResult[]>();
  for (const r of results) {
    const k = key(r);
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }
  const out = new Map<string, EngineResult>();
  for (const [k, rs] of groups) {
    const best = bestOf(rs, dir);
    if (best) out.set(k, best);
  }
  return out;
}

/** Signed delta of `current` vs the best result strictly BEFORE it. null if no prior. */
export function improvementDelta(
  current: EngineResult,
  priorResults: EngineResult[],
  dir: Direction,
): number | null {
  const before = priorResults.filter(
    (r) => !r.dnf && r.date.getTime() < current.date.getTime(),
  );
  const prior = bestOf(before, dir);
  if (!prior) return null;
  return current.value - prior.value;
}
