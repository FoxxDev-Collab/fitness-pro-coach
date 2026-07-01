import type { UnitType } from "./types";

/** Parse "19:42", "19:42.5", "1:02:03", or bare seconds "58.4" into seconds. */
export function parseTime(input: string): number {
  const s = input.trim();
  if (!s) throw new Error("Empty time");
  const parts = s.split(":");
  if (parts.length > 3) throw new Error(`Invalid time: ${input}`);
  let seconds = 0;
  for (const part of parts) {
    if (part.trim() === "") throw new Error(`Invalid time: ${input}`);
    const n = Number(part);
    if (Number.isNaN(n)) throw new Error(`Invalid time: ${input}`);
    seconds = seconds * 60 + n;
  }
  return seconds;
}

/** Format seconds → "19:42", "19:42.5", or "1:02:03". */
export function formatTime(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  let s = Math.abs(seconds);
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const whole = Math.floor(s);
  const tenths = Math.round((s - whole) * 10);
  const secStr = String(whole).padStart(2, "0") + (tenths ? `.${tenths}` : "");
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, "0")}:${secStr}`;
  return `${sign}${m}:${secStr}`;
}

export function formatValue(value: number, unitType: UnitType): string {
  switch (unitType) {
    case "TIME":
      return formatTime(value);
    case "DISTANCE":
      return `${value.toFixed(2)} m`;
    case "WEIGHT":
      return `${value % 1 === 0 ? value : value.toFixed(1)} kg`;
    case "POINTS":
      return `${value}`;
  }
}
