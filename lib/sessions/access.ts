import { normalizeEmail } from "@/lib/portal/linking";

export type SessionActor = {
  id?: string | null;
  role?: string | null;
  email?: string | null;
};

export type AssignmentOwner = {
  client?: { coachId: string | null; userId: string | null } | null;
  athlete?: {
    email: string | null;
    team?: { coachId: string } | null;
    user?: { id: string } | null;
  } | null;
};

/**
 * Who may read/write workout sessions for an assignment:
 * - the coach who owns the client / the athlete's team,
 * - the CLIENT the assignment belongs to (via Client.userId),
 * - the athlete THEMSELVES in the portal, matched by their own roster email
 *   (parents remain read-only — a portal login only logs its own workouts).
 *
 * Pure so the authorization matrix can be unit-tested without a DB.
 */
export function sessionAccess(actor: SessionActor, assignment: AssignmentOwner) {
  const ownerCoachId = assignment.client?.coachId ?? assignment.athlete?.team?.coachId;
  const ownerUserId = assignment.client?.userId ?? assignment.athlete?.user?.id;
  const email = normalizeEmail(actor.email);

  const isCoach = actor.role === "COACH" && !!ownerCoachId && ownerCoachId === actor.id;
  const isClient = actor.role === "CLIENT" && !!ownerUserId && ownerUserId === actor.id;
  const isPortalAthlete =
    actor.role === "PORTAL" &&
    !!email &&
    normalizeEmail(assignment.athlete?.email ?? null) === email;

  return {
    isCoach,
    isClient,
    isPortalAthlete,
    authorized: isCoach || isClient || isPortalAthlete,
  };
}
