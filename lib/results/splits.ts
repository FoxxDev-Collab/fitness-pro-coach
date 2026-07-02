// Pure, client-safe split analysis. Turns a runner's ordered segment times
// (e.g. mile 1/2/3, or 400m repeats at practice) into the pacing insights a
// coach actually reads: cumulative time, per-segment surge/fade, and whether
// the athlete ran even / negative / positive splits.

export type SplitInput = { order: number; label: string | null; value: number };

export type SplitSegment = {
  order: number;
  label: string | null;
  value: number;
  cumulative: number;
  /** vs the previous split: >0 slower (fade), <0 faster (surge), null for the first. */
  delta: number | null;
  fastest: boolean;
  slowest: boolean;
};

export type SplitAnalysis = {
  segments: SplitSegment[];
  total: number;
  fastest: number;
  slowest: number;
  spread: number; // slowest - fastest
  trend: "even" | "negative" | "positive";
};

/** Returns null when there are fewer than 2 usable splits (nothing to compare). */
export function analyzeSplits(splits: SplitInput[]): SplitAnalysis | null {
  const sorted = splits.filter((s) => s.value > 0).sort((a, b) => a.order - b.order);
  if (sorted.length < 2) return null;

  const values = sorted.map((s) => s.value);
  const fastest = Math.min(...values);
  const slowest = Math.max(...values);
  const total = values.reduce((a, b) => a + b, 0);

  let cumulative = 0;
  const segments: SplitSegment[] = sorted.map((s, i) => {
    cumulative += s.value;
    return {
      order: s.order,
      label: s.label,
      value: s.value,
      cumulative,
      delta: i === 0 ? null : s.value - sorted[i - 1].value,
      fastest: s.value === fastest,
      slowest: s.value === slowest,
    };
  });

  // Compare the first vs last third-ish (halves) to classify the pacing.
  const half = Math.max(1, Math.floor(sorted.length / 2));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const first = avg(values.slice(0, half));
  const last = avg(values.slice(sorted.length - half));
  const eps = 0.02 * (total / values.length); // 2% of the average split

  const trend: SplitAnalysis["trend"] =
    last < first - eps ? "negative" : last > first + eps ? "positive" : "even";

  return { segments, total, fastest, slowest, spread: slowest - fastest, trend };
}
