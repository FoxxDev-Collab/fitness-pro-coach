import { describe, it, expect } from "vitest";
import {
  generatePortalToken,
  portalTokenExpiry,
  isPortalTokenUsable,
  PORTAL_TOKEN_TTL_MS,
} from "./token";

describe("generatePortalToken", () => {
  it("is 64 hex chars (256-bit)", () =>
    expect(generatePortalToken()).toMatch(/^[0-9a-f]{64}$/));
  it("differs each call", () =>
    expect(generatePortalToken()).not.toBe(generatePortalToken()));
});

describe("portalTokenExpiry", () => {
  it("is TTL ahead of now", () => {
    const now = new Date("2026-07-03T12:00:00Z");
    expect(portalTokenExpiry(now).getTime()).toBe(now.getTime() + PORTAL_TOKEN_TTL_MS);
  });
});

describe("isPortalTokenUsable", () => {
  const now = new Date("2026-07-03T12:00:00Z");
  const future = new Date(now.getTime() + 60_000);
  const past = new Date(now.getTime() - 60_000);

  it("accepts an unused, unexpired token", () =>
    expect(isPortalTokenUsable({ used: false, expires: future }, now)).toBe(true));
  it("rejects a used token", () =>
    expect(isPortalTokenUsable({ used: true, expires: future }, now)).toBe(false));
  it("rejects an expired token", () =>
    expect(isPortalTokenUsable({ used: false, expires: past }, now)).toBe(false));
  it("rejects null/undefined", () => {
    expect(isPortalTokenUsable(null, now)).toBe(false);
    expect(isPortalTokenUsable(undefined, now)).toBe(false);
  });
});
