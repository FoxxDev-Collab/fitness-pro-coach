import { describe, it, expect } from "vitest";
import { computeTeamScore } from "./scoring";
import type { EngineResult } from "./types";

const f = (place: number, value: number, dnf = false): EngineResult => ({
  id: `r${place}`, athleteId: `a${place}`, disciplineId: "5k", eventId: "e",
  value, place, squad: "Varsity", gender: "M", dnf, date: new Date("2026-09-01"),
});

describe("computeTeamScore", () => {
  it("sums top-5 places, marks displacers, computes pack/spread/avg", () => {
    const s = computeTeamScore([
      f(3, 1180), f(5, 1190), f(8, 1200), f(12, 1210), f(14, 1220),
      f(18, 1240), f(21, 1260),
    ]);
    expect(s.complete).toBe(true);
    expect(s.score).toBe(3 + 5 + 8 + 12 + 14);
    expect(s.scorers.map((r) => r.place)).toEqual([3, 5, 8, 12, 14]);
    expect(s.displacers.map((r) => r.place)).toEqual([18, 21]);
    expect(s.packTimeSeconds).toBe(1220 - 1180);
    expect(s.averageSeconds).toBeCloseTo((1180 + 1190 + 1200 + 1210 + 1220) / 5);
  });
  it("fewer than 5 finishers → incomplete, no score", () => {
    const s = computeTeamScore([f(1, 1000), f(2, 1010)]);
    expect(s.complete).toBe(false);
    expect(s.score).toBeNull();
  });
  it("excludes DNF from scoring", () => {
    const s = computeTeamScore([
      f(1, 1000), f(2, 1010, true), f(3, 1020), f(4, 1030), f(5, 1040), f(6, 1050),
    ]);
    // DNF at place 2 removed → scorers are places 1,3,4,5,6
    expect(s.scorers.map((r) => r.place)).toEqual([1, 3, 4, 5, 6]);
    expect(s.score).toBe(1 + 3 + 4 + 5 + 6);
  });
});
