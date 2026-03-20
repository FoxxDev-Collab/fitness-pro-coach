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
import type { ExerciseProgressData } from "@/lib/utils/exercise-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StrengthChart({ data }: { data: ExerciseProgressData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">{data.name}</CardTitle>
          <span
            className={cn(
              "text-sm tabular-nums font-medium",
              data.change > 0
                ? "text-success"
                : data.change < 0
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {data.change > 0 ? "+" : ""}
            {data.change} lbs
          </span>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {data.first} → {data.last} lbs ({data.entries.length} sessions)
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.entries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["dataMin - 5", "dataMax + 5"]}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
                formatter={(value) => [`${value} lbs`, "Weight"]}
              />
              <Line
                type="monotone"
                dataKey="weight"
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
