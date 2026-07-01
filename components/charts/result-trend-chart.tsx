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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatValue } from "@/lib/results/format";
import type { UnitType, Direction } from "@/lib/results/types";

type ResultTrendChartProps = {
  title: string;
  unitType: UnitType;
  direction: Direction;
  data: { date: string; value: number }[];
  height?: number;
};

export function ResultTrendChart({
  title,
  unitType,
  direction,
  data,
  height = 180,
}: ResultTrendChartProps) {
  if (data.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Need at least 2 results to show a trend
          </p>
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    color: "hsl(var(--popover-foreground))",
    fontSize: 12,
  };

  const fmt = (v: number) => formatValue(v, unitType);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                // For lower-is-better (times), flip the axis so "up" = better.
                reversed={direction === "LOWER_BETTER"}
                domain={["dataMin", "dataMax"]}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={fmt}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [fmt(Number(value)), title]}
              />
              <Line
                type="monotone"
                dataKey="value"
                className="stroke-foreground"
                stroke="currentColor"
                strokeWidth={2}
                dot={{ r: 3, className: "fill-foreground stroke-foreground" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
