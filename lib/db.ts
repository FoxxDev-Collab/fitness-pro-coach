import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getImpersonationContext } from "@/lib/impersonation";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// Mutation operations we audit when performed under admin impersonation.
const WRITE_OPS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const base = new PrismaClient({ adapter });

  // Best-effort audit of every mutation made while an admin is impersonating a
  // coach/client. Without this, actions taken during impersonation are
  // indistinguishable from the impersonated user's own. The write goes through
  // the *base* client so it never re-enters this hook (no recursion), and the
  // whole thing is wrapped so a logging failure — or running outside a request
  // context (seed/scripts, where cookies() throws) — can never block the actual
  // mutation.
  async function auditIfImpersonating(
    model: string | undefined,
    operation: string,
    args: unknown,
  ) {
    try {
      const imp = await getImpersonationContext();
      if (!imp) return;
      const where = (args as { where?: { id?: unknown } } | undefined)?.where;
      const targetId = typeof where?.id === "string" ? where.id : null;
      await base.auditLog.create({
        data: {
          actorUserId: imp.adminId,
          action: "impersonated.write",
          targetId,
          metadata: {
            model: model ?? null,
            operation,
            impersonatedUserId: imp.targetUserId,
          },
        },
      });
    } catch {
      // Swallow — auditing must never break a write.
    }
  }

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model !== "AuditLog" && WRITE_OPS.has(operation)) {
            await auditIfImpersonating(model, operation, args);
          }
          return query(args);
        },
      },
    },
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
