import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/signup", "/invite", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const user = req.auth?.user;

  // Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Root redirect by role
  if (pathname === "/") {
    if (user.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    if (user.role === "CLIENT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/clients", req.url));
  }

  // Role-based route protection
  const coachRoutes = ["/clients", "/exercises", "/programs", "/reports", "/session", "/settings"];
  const clientRoutes = ["/dashboard", "/workout", "/progress"];
  const adminRoutes = ["/admin"];

  if (adminRoutes.some((r) => pathname.startsWith(r)) && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (clientRoutes.some((r) => pathname.startsWith(r)) && user.role !== "CLIENT") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (coachRoutes.some((r) => pathname.startsWith(r)) && user.role !== "COACH") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
