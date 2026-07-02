"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// Distinct hues for per-athlete lines. Lime (--primary) is deliberately
// reserved for the bold team-average line so it always reads as "the team".
const PALETTE = [
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.70 0.15 200)",
  "oklch(0.72 0.16 30)",
  "oklch(0.66 0.20 330)",
  "oklch(0.78 0.13 110)",
];

export type ChartSeries = { key: string; name: string };

export function MultiSeriesTrendChart({
  data,
  series,
  unit,
  height = 240,
  showAverage = false,
  invertY = false,
}: {
  data: Record<string, number | string>[];
  series: ChartSeries[];
  unit?: string;
  height?: number;
  /** Render the bold lime `__avg` line on top of the per-athlete lines. */
  showAverage?: boolean;
  /** Lower-is-better metrics (e.g. race times) read better with Y inverted. */
  invertY?: boolean;
}) {
  if (data.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Need at least 2 recorded dates to plot a trend.
      </p>
    );
  }

  const nameByKey = new Map(series.map((s) => [s.key, s.name]));
  nameByKey.set("__avg", "Team average");

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            reversed={invertY}
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            formatter={(value, key) => [
              `${value}${unit ? ` ${unit}` : ""}`,
              nameByKey.get(String(key)) ?? String(key),
            ]}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={1.5}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
          {showAverage && (
            <Line
              type="monotone"
              dataKey="__avg"
              name="Team average"
              stroke="var(--primary)"
              strokeWidth={2.75}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Small colored-dot legend, wraps freely — cheaper visually than recharts' legend. */
export function ChartLegend({
  series,
  showAverage,
}: {
  series: ChartSeries[];
  showAverage?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {showAverage && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: "var(--primary)" }} />
          Team average
        </span>
      )}
      {series.map((s, i) => (
        <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="h-0.5 w-3.5 rounded-full"
            style={{ background: PALETTE[i % PALETTE.length] }}
          />
          {s.name}
        </span>
      ))}
    </div>
  );
}
