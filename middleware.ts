import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/signup", "/invite", "/api/auth"];

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

  // Not logged in → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
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
