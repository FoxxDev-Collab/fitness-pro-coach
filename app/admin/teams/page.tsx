import Link from "next/link";
import { ChevronRight, AlertCircle } from "lucide-react";
import { listTeamsAdmin } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ListToolbar, Pagination } from "@/components/admin/list-toolbar";

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const result = await listTeamsAdmin({ q: sp.q, page: sp.page as never });
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">All teams</h1>
        <p className="text-sm text-muted-foreground tabular-nums">{total} across all coaches</p>
      </div>

      <ListToolbar placeholder="Search by team name, sport, or coach..." />

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No teams match those filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <Link
              key={t.id}
              href={`/admin/teams/${t.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{t.name}</p>
                  <Badge variant={t.active ? "default" : "secondary"}>
                    {t.active ? "Active" : "Archived"}
                  </Badge>
                  {t.sport && <span className="text-xs text-muted-foreground">{t.sport}</span>}
                  {t.season && <span className="text-xs text-muted-foreground">{t.season}</span>}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  Coach: {t.coach?.name || t.coach?.email}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <div className="text-right text-xs text-muted-foreground">
                  <p className="tabular-nums">{t._count.athletes} athletes</p>
                  <p className="tabular-nums">{t._count.teamAssignments} programs</p>
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
