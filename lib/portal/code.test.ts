import { describe, it, expect } from "vitest";
import { generateJoinCode, normalizeJoinCode, JOIN_CODE_LENGTH } from "./code";

describe("generateJoinCode", () => {
  it("has the default length", () =>
    expect(generateJoinCode()).toHaveLength(JOIN_CODE_LENGTH));

  it("respects a custom length", () =>
    expect(generateJoinCode(12)).toHaveLength(12));

  it("uses only ambiguity-free characters (no 0/1/I/L/O/U)", () => {
    const code = generateJoinCode(1000);
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]+$/);
    expect(code).not.toMatch(/[01ILOU]/);
  });

  it("is effectively unique across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generateJoinCode());
    // Collisions in 2000 draws from 30^8 space should be vanishingly rare.
    expect(seen.size).toBe(2000);
  });
});

describe("normalizeJoinCode", () => {
  it("uppercases and trims", () =>
    expect(normalizeJoinCode("  ab7kd9mn ")).toBe("AB7KD9MN"));
  it("strips spaces and dashes", () =>
    expect(normalizeJoinCode("ab7k-d9mn")).toBe("AB7KD9MN"));
});
