"use client";

import { MeasurementChart } from "@/components/charts/measurement-chart";
import { StrengthChart } from "@/components/charts/strength-chart";
import { TrendingUp } from "lucide-react";
import type { ExerciseProgressData } from "@/lib/utils/exercise-progress";

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

export function ProgressCharts({
  measurements,
  exerciseProgress,
}: {
  measurements: Measurement[];
  exerciseProgress: ExerciseProgressData[];
}) {
  return (
    <div className="space-y-6">
      {measurements.length >= 2 && (
        <MeasurementChart measurements={measurements} />
      )}

      {exerciseProgress.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="size-4" /> Strength Progress
          </h2>
          <div className="space-y-3">
            {exerciseProgress.map((data) => (
              <StrengthChart key={data.name} data={data} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
