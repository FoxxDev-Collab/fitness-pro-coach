import { listAuditLog } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListToolbar, FilterSelect, Pagination } from "@/components/admin/list-toolbar";
import { AlertCircle } from "lucide-react";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const result = await listAuditLog({ q: sp.q, action: sp.action, page: sp.page as never });
  if ("error" in result) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex gap-2">
        <AlertCircle className="size-4 mt-0.5" /> {result.error}
      </div>
    );
  }
  const { items, total, page, pageSize } = result;

  const actionOptions = [
    { value: "user.toggle_status", label: "Toggle status" },
    { value: "user.update_profile", label: "Update profile" },
    { value: "user.reset_password", label: "Reset password" },
    { value: "user.promote_to_admin", label: "Promote to admin" },
    { value: "user.demote_to_coach", label: "Demote to coach" },
    { value: "user.delete", label: "Delete user" },
    { value: "user.invite_admin", label: "Invite admin" },
    { value: "impersonation.start", label: "Impersonation started" },
    { value: "impersonation.stop", label: "Impersonation stopped" },
    { value: "data.export", label: "Data export" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground tabular-nums">{total} entries</p>
      </div>

      <ListToolbar
        placeholder="Search by actor, action, or target id..."
        filters={
          <FilterSelect paramKey="action" defaultLabel="All actions" options={actionOptions} />
        }
      />

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No audit events match these filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((a) => (
                <li key={a.id} className="p-4 text-sm flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                  <div className="shrink-0 sm:w-48">
                    <p className="font-mono text-xs">{a.action}</p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs">
                      <span className="text-muted-foreground">Actor:</span>{" "}
                      <span className="font-medium">{a.actorEmail || "system"}</span>
                    </p>
                    {a.targetId && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Target:</span>{" "}
                        <code className="font-mono">{a.targetType}/{a.targetId}</code>
                      </p>
                    )}
                    {a.metadata !== null && a.metadata !== undefined && (
                      <pre className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1 overflow-x-auto">
                        {JSON.stringify(a.metadata, null, 0)}
                      </pre>
                    )}
                    {(a.ip || a.userAgent) && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {a.ip || ""}{a.ip && a.userAgent ? " · " : ""}{a.userAgent || ""}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 sm:self-start font-mono text-[10px]">
                    {a.id.slice(0, 8)}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
