"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Measurement = {
  date: Date | string;
  weight: number | null;
  bodyFat: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arms: number | null;
  thighs: number | null;
};

const FIELDS = [
  { key: "weight" as const, label: "Weight", unit: "lbs" },
  { key: "bodyFat" as const, label: "Body Fat", unit: "%" },
  { key: "chest" as const, label: "Chest", unit: "in" },
  { key: "waist" as const, label: "Waist", unit: "in" },
  { key: "hips" as const, label: "Hips", unit: "in" },
  { key: "arms" as const, label: "Arms", unit: "in" },
  { key: "thighs" as const, label: "Thighs", unit: "in" },
];

export function MeasurementChart({
  measurements,
}: {
  measurements: Measurement[];
}) {
  const [activeField, setActiveField] = useState<(typeof FIELDS)[number]>(
    FIELDS[0]
  );

  // Sort chronologically and filter to entries that have the selected field
  const data = [...measurements]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter((m) => m[activeField.key] != null)
    .map((m) => ({
      date: new Date(m.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: m[activeField.key] as number,
    }));

  if (measurements.length < 2) return null;

  // Only show field buttons for fields that have data
  const availableFields = FIELDS.filter((f) =>
    measurements.some((m) => m[f.key] != null)
  );

  if (availableFields.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Measurement Trends
        </CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {availableFields.map((f) => (
            <Button
              key={f.key}
              variant={activeField.key === f.key ? "default" : "outline"}
              size="sm"
              className={cn("h-7 text-xs", activeField.key === f.key && "pointer-events-none")}
              onClick={() => setActiveField(f)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {data.length >= 2 ? (
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
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
                  formatter={(value) => [
                    `${value} ${activeField.unit}`,
                    activeField.label,
                  ]}
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
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Need at least 2 data points to show a chart
          </p>
        )}
      </CardContent>
    </Card>
  );
}
