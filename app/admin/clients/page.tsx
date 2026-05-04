import Link from "next/link";
import { ChevronRight, AlertCircle } from "lucide-react";
import { listClientsAdmin } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ListToolbar, FilterSelect, Pagination } from "@/components/admin/list-toolbar";
import { ExportCsvButton } from "@/components/admin/export-button";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; hasAccount?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const result = await listClientsAdmin({
    q: sp.q,
    status: sp.status as never,
    hasAccount: sp.hasAccount as never,
    page: sp.page as never,
  });
  if ("error" in result) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex gap-2">
        <AlertCircle className="size-4 mt-0.5" /> {result.error}
      </div>
    );
  }
  const { items, total, page, pageSize } = result;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All clients</h1>
          <p className="text-sm text-muted-foreground tabular-nums">{total} across all coaches</p>
        </div>
        <ExportCsvButton kind="clients" />
      </div>

      <ListToolbar
        placeholder="Search by client name, email, or coach..."
        filters={
          <>
            <FilterSelect
              paramKey="status"
              defaultLabel="All statuses"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            <FilterSelect
              paramKey="hasAccount"
              defaultLabel="All accounts"
              options={[
                { value: "yes", label: "Has account" },
                { value: "no", label: "No account" },
              ]}
            />
          </>
        }
      />

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No clients match those filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{c.name}</p>
                  <Badge variant={c.active ? "default" : "secondary"}>
                    {c.active ? "Active" : "Inactive"}
                  </Badge>
                  {c.userId && <Badge variant="outline">Has account</Badge>}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {c.email || "No email"} · Coach: {c.coach?.name || c.coach?.email || "Unknown"}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <div className="text-right text-xs text-muted-foreground">
                  <p className="tabular-nums">{c._count.assignments} programs</p>
                  <p>{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
