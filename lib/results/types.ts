export type UnitType = "TIME" | "DISTANCE" | "WEIGHT" | "POINTS";
export type Direction = "LOWER_BETTER" | "HIGHER_BETTER";

// A minimal shape the engine needs — decoupled from Prisma rows.
export type EngineResult = {
  id: string;
  athleteId: string;
  disciplineId: string;
  eventId: string;
  value: number; // canonical unit (seconds for TIME)
  place: number | null;
  squad: string | null;
  gender: string | null; // from Athlete.gender, for scoring groups
  dnf: boolean;
  date: Date; // the meet date, for ordering
};
