"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export type StatTileProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  delta?: { value: string; direction: "up" | "down" | "flat"; good?: boolean };
  /** Optional mini trend rendered along the bottom of the tile. */
  spark?: number[];
  /** Draw a lime accent bar down the left edge. */
  accent?: boolean;
  icon?: React.ReactNode;
};

export function StatTile({
  label,
  value,
  sublabel,
  delta,
  spark,
  accent,
  icon,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm border bg-card px-3.5 py-3",
        accent && "border-l-2 border-l-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>

      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold leading-none tabular-nums">
          {value}
        </span>
        {delta && <DeltaChip {...delta} />}
      </div>

      {sublabel && (
        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
      )}

      {spark && spark.length >= 2 && (
        <div className="mt-2 h-8 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark.map((v, i) => ({ i, v }))}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="var(--primary)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DeltaChip({
  value,
  direction,
  good,
}: {
  value: string;
  direction: "up" | "down" | "flat";
  good?: boolean;
}) {
  const Icon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const tone =
    good === undefined
      ? "text-muted-foreground bg-muted"
      : good
        ? "text-success bg-success/10"
        : "text-destructive bg-destructive/10";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm px-1 py-0.5 font-mono text-[11px] font-medium tabular-nums",
        tone,
      )}
    >
      <Icon className="size-3" />
      {value}
    </span>
  );
}
