// Pure, client-safe aggregation helpers for team analytics dashboards.
// No server imports — safe to use in client components. These turn the raw
// metric entries / race rows already loaded on the team page into the shapes
// the analytics primitives render.

export type SeriesPoint = { date: string; ts: number; value: number };
export type AthleteSeries = { id: string; name: string; points: SeriesPoint[] };

export type EntryLike = {
  value: number;
  date: string | Date;
  athlete?: { id: string; name: string } | null;
  metricDefinition: { id: string };
};

export const fmtShortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Group a metric's entries into one ascending time series per athlete. */
export function athleteSeriesForMetric(
  entries: EntryLike[],
  metricDefId: string,
): AthleteSeries[] {
  const byAthlete = new Map<string, AthleteSeries>();
  for (const e of entries) {
    if (e.metricDefinition.id !== metricDefId || !e.athlete) continue;
    const existing =
      byAthlete.get(e.athlete.id) ??
      { id: e.athlete.id, name: e.athlete.name, points: [] };
    existing.points.push({
      date: fmtShortDate(e.date),
      ts: new Date(e.date).getTime(),
      value: e.value,
    });
    byAthlete.set(e.athlete.id, existing);
  }
  for (const s of byAthlete.values()) s.points.sort((a, b) => a.ts - b.ts);
  return [...byAthlete.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Average across all athletes at each recorded date. */
export function teamAverageSeries(series: AthleteSeries[]): SeriesPoint[] {
  const byTs = new Map<number, { date: string; sum: number; n: number }>();
  for (const s of series) {
    for (const p of s.points) {
      const g = byTs.get(p.ts) ?? { date: p.date, sum: 0, n: 0 };
      g.sum += p.value;
      g.n += 1;
      byTs.set(p.ts, g);
    }
  }
  return [...byTs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, g]) => ({ ts, date: g.date, value: Math.round((g.sum / g.n) * 100) / 100 }));
}

export type LeaderRow = {
  id: string;
  name: string;
  value: number;
  delta: number | null;
};

/** Latest value per athlete with change from the previous entry. */
export function latestByAthlete(series: AthleteSeries[]): LeaderRow[] {
  return series
    .map((s) => {
      const n = s.points.length;
      const value = n ? s.points[n - 1].value : 0;
      const delta =
        n >= 2 ? Math.round((s.points[n - 1].value - s.points[n - 2].value) * 100) / 100 : null;
      return { id: s.id, name: s.name, value, delta };
    })
    .filter((r) => r.value !== undefined);
}

/**
 * Fold per-athlete series (plus an optional team-average series) into the
 * "wide" row format recharts wants: one row per date, one key per athlete
 * (keyed by athlete id) plus `__avg`.
 */
export function toWideSeries(
  series: AthleteSeries[],
  average?: SeriesPoint[],
): Record<string, number | string>[] {
  const dates = new Map<number, string>();
  for (const s of series) for (const p of s.points) dates.set(p.ts, p.date);
  if (average) for (const p of average) dates.set(p.ts, p.date);

  return [...dates.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, date]) => {
      const row: Record<string, number | string> = { date };
      for (const s of series) {
        const pt = s.points.find((p) => p.ts === ts);
        if (pt) row[s.id] = pt.value;
      }
      if (average) {
        const a = average.find((p) => p.ts === ts);
        if (a) row.__avg = a.value;
      }
      return row;
    });
}

/** Team average of a discipline's race values per meet date (ascending). */
export function disciplineProgression(
  rows: {
    value: number;
    dnf: boolean;
    disciplineId: string;
    event: { startTime: string | Date };
  }[],
  disciplineId: string,
): SeriesPoint[] {
  const byTs = new Map<number, { date: string; sum: number; n: number }>();
  for (const r of rows) {
    if (r.disciplineId !== disciplineId || r.dnf) continue;
    const ts = new Date(r.event.startTime).getTime();
    const g = byTs.get(ts) ?? { date: fmtShortDate(r.event.startTime), sum: 0, n: 0 };
    g.sum += r.value;
    g.n += 1;
    byTs.set(ts, g);
  }
  return [...byTs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, g]) => ({ ts, date: g.date, value: Math.round((g.sum / g.n) * 100) / 100 }));
}
