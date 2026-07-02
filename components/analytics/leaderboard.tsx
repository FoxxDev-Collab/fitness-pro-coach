"use client";

import { cn } from "@/lib/utils";
import { DeltaChip } from "./stat-tile";

export type LeaderboardRow = {
  id: string;
  name: string;
  value: string;
  meta?: string;
  delta?: { value: string; direction: "up" | "down" | "flat"; good?: boolean };
};

export function Leaderboard({
  rows,
  emptyLabel = "No data yet",
}: {
  rows: LeaderboardRow[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <ol className="divide-y">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-center gap-3 py-1.5 first:pt-0 last:pb-0">
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-sm font-mono text-[11px] font-semibold tabular-nums",
              i === 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{r.name}</p>
            {r.meta && (
              <p className="truncate text-xs text-muted-foreground">{r.meta}</p>
            )}
          </div>
          {r.delta && <DeltaChip {...r.delta} />}
          <span className="font-mono text-sm font-semibold tabular-nums">
            {r.value}
          </span>
        </li>
      ))}
    </ol>
  );
}
