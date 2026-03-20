import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
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

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") redirect("/login");
  return session;
}

export async function getCoachId() {
  const session = await requireCoach();
  return session.user.id;
}

export async function getClientUserId() {
  const session = await requireClient();
  return session.user.id;
}
