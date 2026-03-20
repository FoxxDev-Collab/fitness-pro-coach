export type ExerciseProgressEntry = {
  date: string;
  weight: number;
};

export type ExerciseProgressData = {
  name: string;
  entries: ExerciseProgressEntry[];
  first: number;
  last: number;
  change: number;
};

type LogInput = {
  assignmentId: string;
  date: Date | string;
  exercises: {
    exerciseIndex: number;
    weight: number | null;
    setDetails: {
      weight: number | null;
      reps: number | null;
    }[];
  }[];
};

type AssignmentInput = {
  id: string;
  clientId?: string;
  workouts: {
    exercises: {
      name: string;
      type: string;
    }[];
  }[];
};

export function computeExerciseProgress(
  logs: LogInput[],
  assignments: AssignmentInput[]
): ExerciseProgressData[] {
  const progress: Record<string, { name: string; entries: ExerciseProgressEntry[] }> = {};

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const log of sortedLogs) {
    const assignment = assignments.find((a) => a.id === log.assignmentId);
    if (!assignment) continue;

    for (const ex of log.exercises) {
      const workout = assignment.workouts[0];
      if (!workout) continue;

      const exerciseInfo = workout.exercises[ex.exerciseIndex];
      if (!exerciseInfo || exerciseInfo.type !== "weight") continue;

      const maxWeight =
        ex.setDetails.length > 0
          ? Math.max(...ex.setDetails.map((s) => s.weight || 0))
          : ex.weight || 0;

      if (maxWeight > 0) {
        if (!progress[exerciseInfo.name]) {
          progress[exerciseInfo.name] = { name: exerciseInfo.name, entries: [] };
        }
        progress[exerciseInfo.name].entries.push({
          date: new Date(log.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          weight: maxWeight,
        });
      }
    }
  }

  return Object.values(progress).map((p) => {
    const first = p.entries[0]?.weight || 0;
    const last = p.entries[p.entries.length - 1]?.weight || 0;
    return {
      name: p.name,
      entries: p.entries,
      first,
      last,
      change: last - first,
    };
  });
}
