import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// Accept either the native Upstash REST env names or the KV_REST_API_* names
// that Vercel's Upstash Marketplace integration injects, so it works however
// the Redis store was provisioned.
const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const hasUpstash = !!redisUrl && !!redisToken;

const isProd = process.env.NODE_ENV === "production";
// When Upstash is unconfigured, rate limiting can't enforce. By default we
// fail OPEN (so local dev and a misconfigured deploy still work) but shout
// about it. Set RATE_LIMIT_STRICT=true to fail CLOSED in production instead —
// do that only once Upstash is actually provisioned, or you'll lock out auth.
const strictMode = process.env.RATE_LIMIT_STRICT === "true";

const redis =
  redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Cold-start warning: in production a missing Upstash config silently disables
// brute-force protection on login / password reset / MFA. Surface it loudly so
// it shows up in Vercel logs / Sentry rather than passing unnoticed.
if (isProd && !hasUpstash) {
  console.error(
    "[rate-limit] No Redis configured (UPSTASH_REDIS_REST_URL/TOKEN or " +
      "KV_REST_API_URL/TOKEN) — rate limiting is DISABLED in production. " +
      "Connect an Upstash store and set RATE_LIMIT_STRICT=true to fail closed.",
  );
}

type Window = `${number} ${"s" | "m" | "h" | "d"}`;

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, limit: number, window: Window): Ratelimit | null {
  if (!redis) return null;
  const key = `${name}:${limit}:${window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `praevio:rl:${name}`,
      analytics: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") || "unknown";
}

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

/**
 * Sliding-window rate limit by IP. No-ops (allows all) when Upstash env vars
 * are not configured, so local dev works without Redis. In production, set
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enforce.
 */
export async function rateLimitByIp(
  name: string,
  limit: number,
  window: Window,
  extraKey?: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name, limit, window);
  if (!limiter) {
    // No Redis: fail closed in strict production, otherwise fail open (dev).
    if (isProd && strictMode) return { ok: false, retryAfterSeconds: 60 };
    return { ok: true, retryAfterSeconds: 0 };
  }

  const ip = await getClientIp();
  const key = extraKey ? `${ip}:${extraKey}` : ip;
  const { success, reset } = await limiter.limit(key);
  const retryAfterSeconds = success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { ok: success, retryAfterSeconds };
}

export function tooManyRequestsMessage(retryAfterSeconds: number): string {
  if (retryAfterSeconds <= 60) return `Too many attempts. Try again in ${retryAfterSeconds}s.`;
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
