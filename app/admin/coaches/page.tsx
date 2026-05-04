import Link from "next/link";
import { ChevronRight, Sparkles, AlertCircle } from "lucide-react";
import { listCoaches } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ListToolbar, FilterSelect, Pagination } from "@/components/admin/list-toolbar";
import { ExportCsvButton } from "@/components/admin/export-button";

export default async function AdminCoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const result = await listCoaches({ q: sp.q, status: sp.status as never, page: sp.page as never });
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
          <h1 className="text-2xl font-semibold tracking-tight">Coaches</h1>
          <p className="text-sm text-muted-foreground tabular-nums">{total} total</p>
        </div>
        <ExportCsvButton kind="coaches" />
      </div>

      <ListToolbar
        placeholder="Search by name, email, business, specialty, slug..."
        filters={
          <FilterSelect
            paramKey="status"
            defaultLabel="All statuses"
            options={[
              { value: "active", label: "Active" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
        }
      />

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No coaches match those filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((coach) => (
            <Link
              key={coach.id}
              href={`/admin/coaches/${coach.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{coach.name || "Unnamed"}</p>
                  <Badge variant={coach.active ? "default" : "secondary"}>
                    {coach.active ? "Active" : "Disabled"}
                  </Badge>
                  {coach.onboardedAt && (
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="size-3" /> Onboarded
                    </Badge>
                  )}
                  {coach.specialty && (
                    <span className="text-xs text-muted-foreground">{coach.specialty}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {coach.email}
                  {coach.businessName && <> · {coach.businessName}</>}
                  {coach.intakeSlug && <> · /intake/{coach.intakeSlug}</>}
                </p>
              </div>
              <div className="flex items-center gap-4 ml-4 shrink-0">
                <div className="text-right text-xs text-muted-foreground">
                  <p className="tabular-nums">{coach._count.clients} clients</p>
                  <p className="tabular-nums">
                    {coach._count.programs} progs · {coach._count.teams} teams
                  </p>
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
