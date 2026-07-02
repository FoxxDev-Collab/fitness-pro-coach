"use client";

import { analyzeSplits, type SplitInput } from "@/lib/results/splits";
import { formatTime } from "@/lib/results/format";
import { cn } from "@/lib/utils";

const TREND = {
  negative: { label: "Negative split", tone: "text-success", note: "closed faster" },
  positive: { label: "Positive split", tone: "text-destructive", note: "faded late" },
  even: { label: "Even splits", tone: "text-muted-foreground", note: "steady pace" },
} as const;

/**
 * Renders a runner's splits as pacing bars with per-segment surge/fade deltas.
 * Works for a race (mile splits) or a practice interval set (e.g. 6×800m).
 */
export function SplitBreakdown({ splits }: { splits: SplitInput[] }) {
  const analysis = analyzeSplits(splits);
  if (!analysis) return null;

  const meta = TREND[analysis.trend];
  const max = analysis.slowest;

  return (
    <div className="space-y-1.5 rounded-sm border bg-muted/20 p-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium", meta.tone)}>{meta.label}</span>
        <span className="text-muted-foreground">
          Spread {formatTime(analysis.spread)} · {meta.note}
        </span>
      </div>

      <div className="space-y-1">
        {analysis.segments.map((s) => {
          const pct = max > 0 ? Math.max(6, (s.value / max) * 100) : 0;
          return (
            <div key={s.order} className="flex items-center gap-2 text-xs">
              <span className="w-12 shrink-0 truncate text-muted-foreground">
                {s.label || `Split ${s.order}`}
              </span>
              <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted/50">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-sm",
                    s.fastest ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono tabular-nums">
                {formatTime(s.value)}
              </span>
              <span className="w-16 shrink-0 text-right font-mono tabular-nums">
                {s.delta == null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span
                    className={
                      s.delta < 0
                        ? "text-success"
                        : s.delta > 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {s.delta < 0 ? "−" : "+"}
                    {formatTime(Math.abs(s.delta))}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
