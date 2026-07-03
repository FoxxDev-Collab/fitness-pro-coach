import { randomBytes } from "crypto";

/** Magic-link tokens live for 30 minutes and are single-use. */
export const PORTAL_TOKEN_TTL_MS = 30 * 60 * 1000;

/** 256-bit URL-safe hex token for the magic link. */
export function generatePortalToken(): string {
  return randomBytes(32).toString("hex");
}

/** Expiry timestamp for a freshly issued token. */
export function portalTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + PORTAL_TOKEN_TTL_MS);
}

/**
 * A token is usable iff it exists, has not been used, and has not expired.
 * Pure so it can be unit-tested without a DB.
 */
export function isPortalTokenUsable(
  token: { used: boolean; expires: Date } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!token) return false;
  if (token.used) return false;
  return token.expires.getTime() > now.getTime();
}
