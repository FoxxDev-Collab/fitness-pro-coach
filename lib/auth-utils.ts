import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getImpersonationContext } from "@/lib/impersonation";

export type EffectiveSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "ADMIN" | "COACH" | "CLIENT";
  };
  impersonation: { adminUserId: string; adminEmail: string | null } | null;
};

/**
 * Returns the "effective" session, which honors active admin impersonation:
 * - If the real session is an ADMIN and an impersonation cookie is present and valid,
 *   the returned user is the impersonated user (typically a COACH or CLIENT).
 * - The real admin identity is exposed via `impersonation` for banner / audit / exit.
 *
 * Admin role checks (requireAdmin) deliberately use the *real* session — admins
 * always retain admin privileges regardless of impersonation.
 */
export async function getEffectiveSession(): Promise<EffectiveSession | null> {
  const real = await auth();
  if (!real?.user) return null;

  if (real.user.role === "ADMIN") {
    const imp = await getImpersonationContext();
    if (imp) {
      const target = await db.user.findUnique({
        where: { id: imp.targetUserId },
        select: { id: true, name: true, email: true, role: true, active: true },
      });
      if (target?.active && target.role !== "ADMIN") {
        return {
          user: {
            id: target.id,
            name: target.name,
            email: target.email,
            role: target.role as "COACH" | "CLIENT",
          },
          impersonation: {
            adminUserId: real.user.id!,
            adminEmail: real.user.email ?? null,
          },
        };
      }
    }
  }

  return {
    user: {
      id: real.user.id!,
      name: real.user.name,
      email: real.user.email,
      role: real.user.role as "ADMIN" | "COACH" | "CLIENT",
    },
    impersonation: null,
  };
}

export async function requireAuth() {
  const session = await getEffectiveSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireCoach() {
  const session = await requireAuth();
  if (session.user.role !== "COACH") redirect("/login");
  return session;
}

export async function requireClient() {
  const session = await requireAuth();
  if (session.user.role !== "CLIENT") redirect("/login");
  return session;
}

/** Admin checks deliberately bypass impersonation — admin always retains admin powers. */
export async function requireAdmin() {
  const real = await auth();
  if (!real?.user) redirect("/login");
  if (real.user.role !== "ADMIN") redirect("/login");
  return real;
}

export async function getCoachId() {
  const session = await requireCoach();
  return session.user.id;
}

export async function getClientUserId() {
  const session = await requireClient();
  return session.user.id;
}
