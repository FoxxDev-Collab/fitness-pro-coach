/**
 * Portal linking: a single login email resolves to the athletes a viewer may
 * see. Parents match on `parentEmail`; athletes match on their own `email`.
 * This is what makes the parent and athlete portals one and the same — the
 * email is the link, no join table.
 */

export type LinkableAthlete = {
  id: string;
  email: string | null;
  parentEmail: string | null;
  active: boolean;
};

/** Trim + lowercase for case-insensitive comparison. Empty/nullish → null. */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const n = email.trim().toLowerCase();
  return n.length > 0 ? n : null;
}

/**
 * Returns the active athletes linked to `loginEmail` — those whose own email
 * (athlete viewing self) or parentEmail (parent viewing kid) matches. Order is
 * preserved from the input.
 */
export function selectLinkedAthletes<T extends LinkableAthlete>(
  athletes: T[],
  loginEmail: string | null | undefined,
): T[] {
  const target = normalizeEmail(loginEmail);
  if (!target) return [];
  return athletes.filter(
    (a) =>
      a.active &&
      (normalizeEmail(a.email) === target ||
        normalizeEmail(a.parentEmail) === target),
  );
}

/** True if any active athlete on the roster links to this email. */
export function emailMatchesRoster(
  athletes: LinkableAthlete[],
  loginEmail: string | null | undefined,
): boolean {
  return selectLinkedAthletes(athletes, loginEmail).length > 0;
}
