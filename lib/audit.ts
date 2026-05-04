import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Admin audit-log actions. Add new ones here so call sites stay typed.
 * Keep the wire format stable — these strings are persisted in the DB.
 */
export type AuditAction =
  | "user.toggle_status"
  | "user.update_profile"
  | "user.reset_password"
  | "user.change_email"
  | "user.promote_to_admin"
  | "user.demote_to_coach"
  | "user.delete"
  | "user.invite_admin"
  | "impersonation.start"
  | "impersonation.stop"
  | "data.export";

export type AuditTargetType = "user" | "client" | "team" | "athlete" | "program" | "system";

type LogParams = {
  actorUserId: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  targetType?: AuditTargetType | null;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

async function readRequestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    const userAgent = h.get("user-agent");
    return { ip, userAgent };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function logAudit(params: LogParams): Promise<void> {
  const ctx = await readRequestContext();
  try {
    await db.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        actorEmail: params.actorEmail ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
  } catch (err) {
    // Audit logging must never break the user flow.
    console.error("[audit] failed to log event", params.action, err);
  }
}
