import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/login",
  "/signup",
  "/invite",
  "/api/auth",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  // Passwordless portal entry points (no session yet).
  "/join",
  "/portal/login",
  "/portal/verify",
  // PWA assets must be fetchable without a session (anonymous install).
  "/manifest.webmanifest",
  "/sw.js",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for session token (NextAuth JWT cookie)
  const token =
    req.cookies.get("__Secure-authjs.session-token") ||
    req.cookies.get("authjs.session-token");

  // Not logged in → redirect to the right login. Portal routes have their own
  // passwordless login; everything else is the coach/admin login.
  if (!token) {
    const dest = pathname.startsWith("/portal") ? "/portal/login" : "/login";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Let server components handle role-based access
  // (we can't decode JWT in Edge without crypto, so role checks happen server-side)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
