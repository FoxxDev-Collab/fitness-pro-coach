import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  selectLinkedAthletes,
  emailMatchesRoster,
  type LinkableAthlete,
} from "./linking";

const roster: LinkableAthlete[] = [
  { id: "kid1", email: "runner1@school.edu", parentEmail: "mom@home.com", active: true },
  { id: "kid2", email: "runner2@school.edu", parentEmail: "mom@home.com", active: true },
  { id: "kid3", email: "solo@school.edu", parentEmail: null, active: true },
  { id: "kid4", email: "gone@school.edu", parentEmail: "dad@home.com", active: false },
];

describe("normalizeEmail", () => {
  it("trims and lowercases", () =>
    expect(normalizeEmail("  Mom@Home.com ")).toBe("mom@home.com"));
  it("returns null for empty/nullish", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});

describe("selectLinkedAthletes", () => {
  it("returns a parent's kids by parentEmail (both)", () => {
    const ids = selectLinkedAthletes(roster, "mom@home.com").map((a) => a.id);
    expect(ids).toEqual(["kid1", "kid2"]);
  });

  it("returns an athlete viewing themselves by own email", () => {
    const ids = selectLinkedAthletes(roster, "solo@school.edu").map((a) => a.id);
    expect(ids).toEqual(["kid3"]);
  });

  it("is case- and whitespace-insensitive", () => {
    const ids = selectLinkedAthletes(roster, "  MOM@HOME.COM ").map((a) => a.id);
    expect(ids).toEqual(["kid1", "kid2"]);
  });

  it("excludes inactive athletes even on a match", () =>
    expect(selectLinkedAthletes(roster, "dad@home.com")).toEqual([]));

  it("returns [] for an unknown email", () =>
    expect(selectLinkedAthletes(roster, "stranger@nowhere.com")).toEqual([]));

  it("returns [] for a null/empty login email", () => {
    expect(selectLinkedAthletes(roster, null)).toEqual([]);
    expect(selectLinkedAthletes(roster, "")).toEqual([]);
  });
});

describe("emailMatchesRoster", () => {
  it("true when linked", () =>
    expect(emailMatchesRoster(roster, "runner2@school.edu")).toBe(true));
  it("false when not", () =>
    expect(emailMatchesRoster(roster, "stranger@nowhere.com")).toBe(false));
});
