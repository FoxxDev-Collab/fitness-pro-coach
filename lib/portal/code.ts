import { randomBytes } from "crypto";

/**
 * Ambiguity-free alphabet for human-typed join codes: digits 2-9 (no 0/1) and
 * uppercase letters excluding I, L, O, U — so a parent typing a code off a
 * printout can't confuse 0/O, 1/I/L, etc. 30 symbols.
 */
const JOIN_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export const JOIN_CODE_LENGTH = 8;

/**
 * Crypto-random join code of `length` chars from the ambiguity-free alphabet.
 * Uniqueness is enforced by the caller against the unique DB column (retry on
 * the rare collision).
 */
export function generateJoinCode(length: number = JOIN_CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += JOIN_ALPHABET[bytes[i]! % JOIN_ALPHABET.length];
  }
  return out;
}

/** Normalizes a user-typed code: trim, uppercase, strip spaces and dashes. */
export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}
