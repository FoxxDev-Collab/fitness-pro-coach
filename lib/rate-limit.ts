import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

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
  if (!limiter) return { ok: true, retryAfterSeconds: 0 };

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
