import { describe, it, expect } from "vitest";
import { sessionAccess } from "./access";

const clientAssignment = {
  client: { coachId: "coach1", userId: "clientUser1" },
  athlete: null,
};

const athleteAssignment = {
  client: null,
  athlete: {
    email: "runner@school.edu",
    team: { coachId: "coach1" },
    user: { id: "athleteUser1" },
  },
};

describe("sessionAccess — coach", () => {
  it("allows the owning coach of a client assignment", () => {
    expect(
      sessionAccess({ id: "coach1", role: "COACH", email: null }, clientAssignment).authorized,
    ).toBe(true);
  });
  it("allows the owning coach of a team athlete assignment", () => {
    expect(
      sessionAccess({ id: "coach1", role: "COACH" }, athleteAssignment).authorized,
    ).toBe(true);
  });
  it("rejects a different coach", () => {
    expect(
      sessionAccess({ id: "coach2", role: "COACH" }, clientAssignment).authorized,
    ).toBe(false);
  });
});

describe("sessionAccess — client", () => {
  it("allows the client who owns the assignment", () => {
    expect(
      sessionAccess({ id: "clientUser1", role: "CLIENT" }, clientAssignment).authorized,
    ).toBe(true);
  });
  it("rejects a different client", () => {
    expect(
      sessionAccess({ id: "clientUser2", role: "CLIENT" }, clientAssignment).authorized,
    ).toBe(false);
  });
});

describe("sessionAccess — portal athlete (self only)", () => {
  it("allows the athlete themselves (login email === athlete email)", () => {
    const r = sessionAccess(
      { id: "u", role: "PORTAL", email: "runner@school.edu" },
      athleteAssignment,
    );
    expect(r.authorized).toBe(true);
    expect(r.isPortalAthlete).toBe(true);
  });

  it("is case- and whitespace-insensitive on the email match", () => {
    expect(
      sessionAccess(
        { id: "u", role: "PORTAL", email: "  RUNNER@School.edu " },
        athleteAssignment,
      ).authorized,
    ).toBe(true);
  });

  it("REJECTS a parent (email matches parentEmail, not athlete.email)", () => {
    // The parent's login email never equals the athlete's own email.
    expect(
      sessionAccess(
        { id: "u", role: "PORTAL", email: "parent@home.com" },
        athleteAssignment,
      ).authorized,
    ).toBe(false);
  });

  it("REJECTS a portal user whose email matches a DIFFERENT athlete", () => {
    expect(
      sessionAccess(
        { id: "u", role: "PORTAL", email: "someone-else@school.edu" },
        athleteAssignment,
      ).authorized,
    ).toBe(false);
  });

  it("rejects a portal user with no email", () => {
    expect(
      sessionAccess({ id: "u", role: "PORTAL", email: null }, athleteAssignment).authorized,
    ).toBe(false);
  });

  it("rejects PORTAL role against a client assignment (no athlete)", () => {
    expect(
      sessionAccess(
        { id: "u", role: "PORTAL", email: "runner@school.edu" },
        clientAssignment,
      ).authorized,
    ).toBe(false);
  });
});
