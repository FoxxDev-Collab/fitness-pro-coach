import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "praevio.impersonation";
const MAX_AGE_SECONDS = 60 * 60; // 1 hour

export type ImpersonationContext = {
  adminId: string;
  targetUserId: string;
  expires: number;
};

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET or AUTH_SECRET must be set for impersonation");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  const c = (await cookies()).get(COOKIE_NAME);
  if (!c?.value) return null;
  const dot = c.value.indexOf(".");
  if (dot === -1) return null;
  const payload = c.value.slice(0, dot);
  const sig = c.value.slice(dot + 1);
  if (!payload || !sig) return null;
  if (!safeEqual(sign(payload), sig)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ImpersonationContext;
    if (typeof decoded.adminId !== "string" || typeof decoded.targetUserId !== "string") return null;
    if (typeof decoded.expires !== "number" || decoded.expires < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function setImpersonationCookie(adminId: string, targetUserId: string): Promise<void> {
  const ctx: ImpersonationContext = {
    adminId,
    targetUserId,
    expires: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const payload = Buffer.from(JSON.stringify(ctx)).toString("base64url");
  const sig = sign(payload);
  (await cookies()).set(COOKIE_NAME, `${payload}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearImpersonationCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
