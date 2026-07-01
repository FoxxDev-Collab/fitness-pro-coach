import { describe, it, expect } from "vitest";
import { bestOf, seasonBests, improvementDelta } from "./records";
import type { EngineResult } from "./types";

const r = (o: Partial<EngineResult>): EngineResult => ({
  id: "x", athleteId: "a", disciplineId: "5k", eventId: "e",
  value: 0, place: null, squad: null, gender: null, dnf: false, date: new Date("2026-09-01"), ...o,
});

describe("bestOf", () => {
  it("LOWER_BETTER picks min", () =>
    expect(bestOf([r({ value: 1200 }), r({ value: 1182 })], "LOWER_BETTER")!.value).toBe(1182));
  it("HIGHER_BETTER picks max", () =>
    expect(bestOf([r({ value: 10 }), r({ value: 12 })], "HIGHER_BETTER")!.value).toBe(12));
  it("ignores DNF", () =>
    expect(bestOf([r({ value: 1, dnf: true }), r({ value: 1182 })], "LOWER_BETTER")!.value).toBe(1182));
  it("empty → null", () => expect(bestOf([], "LOWER_BETTER")).toBeNull());
});

describe("seasonBests", () => {
  it("keys by athlete+discipline", () => {
    const map = seasonBests(
      [r({ athleteId: "a", value: 1200 }), r({ athleteId: "a", value: 1182 }),
       r({ athleteId: "b", value: 1300 })],
      "LOWER_BETTER",
    );
    expect(map.get("a|5k")!.value).toBe(1182);
    expect(map.get("b|5k")!.value).toBe(1300);
  });
});

describe("improvementDelta", () => {
  it("negative = faster than prior best (LOWER_BETTER)", () => {
    const current = r({ value: 1168, date: new Date("2026-09-15") });
    const prior = [r({ value: 1182, date: new Date("2026-09-01") })];
    expect(improvementDelta(current, prior, "LOWER_BETTER")).toBe(-14);
  });
  it("null when no prior", () =>
    expect(improvementDelta(r({ value: 1182 }), [], "LOWER_BETTER")).toBeNull());
});
