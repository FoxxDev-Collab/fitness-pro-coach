"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { cuid, parseInput } from "@/lib/validations";
import {
  setImpersonationCookie,
  clearImpersonationCookie,
  getImpersonationContext,
} from "@/lib/impersonation";

const startSchema = z.object({ userId: cuid });

export async function startImpersonation(input: { userId: string }) {
  const real = await auth();
  if (!real?.user || real.user.role !== "ADMIN") return { error: "Forbidden" };

  const parsed = parseInput(startSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "User not found" };
  if (target.role === "ADMIN") return { error: "Cannot impersonate another admin" };
  if (!target.active) return { error: "Target account is disabled" };
  if (real.user.id === target.id) return { error: "Cannot impersonate yourself" };

  await setImpersonationCookie(real.user.id!, target.id);

  await logAudit({
    actorUserId: real.user.id ?? null,
    actorEmail: real.user.email ?? null,
    action: "impersonation.start",
    targetType: "user",
    targetId: target.id,
    metadata: { targetEmail: target.email, targetRole: target.role },
  });

  redirect("/");
}

export async function stopImpersonation() {
  const ctx = await getImpersonationContext();
  await clearImpersonationCookie();
  if (ctx) {
    await logAudit({
      actorUserId: ctx.adminId,
      actorEmail: null,
      action: "impersonation.stop",
      targetType: "user",
      targetId: ctx.targetUserId,
    });
  }
  redirect("/admin/dashboard");
}
