import { describe, it, expect } from "vitest";
import { analyzeSplits, type SplitInput } from "./splits";

const s = (order: number, value: number, label: string | null = null): SplitInput => ({
  order,
  value,
  label,
});

describe("analyzeSplits", () => {
  it("returns null with fewer than 2 usable splits", () => {
    expect(analyzeSplits([])).toBeNull();
    expect(analyzeSplits([s(1, 90)])).toBeNull();
    expect(analyzeSplits([s(1, 90), s(2, 0)])).toBeNull(); // 0 filtered out
  });

  it("computes cumulative times and per-split deltas", () => {
    const a = analyzeSplits([s(1, 90), s(2, 95), s(3, 88)])!;
    expect(a.segments.map((x) => x.cumulative)).toEqual([90, 185, 273]);
    expect(a.segments.map((x) => x.delta)).toEqual([null, 5, -7]);
    expect(a.total).toBe(273);
    expect(a.spread).toBe(95 - 88);
  });

  it("orders by `order`, not input order", () => {
    const a = analyzeSplits([s(3, 88), s(1, 90), s(2, 95)])!;
    expect(a.segments.map((x) => x.order)).toEqual([1, 2, 3]);
    expect(a.segments[0].value).toBe(90);
  });

  it("flags fastest and slowest segments", () => {
    const a = analyzeSplits([s(1, 90), s(2, 95), s(3, 88)])!;
    expect(a.segments.find((x) => x.fastest)!.value).toBe(88);
    expect(a.segments.find((x) => x.slowest)!.value).toBe(95);
  });

  it("classifies a negative split (closes faster)", () => {
    expect(analyzeSplits([s(1, 100), s(2, 95), s(3, 90)])!.trend).toBe("negative");
  });

  it("classifies a positive split (fades)", () => {
    expect(analyzeSplits([s(1, 90), s(2, 95), s(3, 100)])!.trend).toBe("positive");
  });

  it("classifies even pacing", () => {
    expect(analyzeSplits([s(1, 90), s(2, 90), s(3, 90)])!.trend).toBe("even");
  });
});
