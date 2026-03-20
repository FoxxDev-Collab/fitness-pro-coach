import { getPlatformStats, getCoaches } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const [stats, coaches] = await Promise.all([
    getPlatformStats(),
    getCoaches(),
  ]);

  const statCards = [
    { label: "Coaches", value: stats.coaches },
    { label: "Clients", value: stats.clients },
    { label: "Total Sessions", value: stats.sessions },
    { label: "This Week", value: stats.recentSessions },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Coaches</CardTitle>
        </CardHeader>
        <CardContent>
          {coaches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No coaches yet</p>
          ) : (
            <div className="space-y-2">
              {coaches.slice(0, 10).map((coach) => (
                <div
                  key={coach.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{coach.name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{coach.email}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{coach._count.clients} clients</p>
                    <p>{coach._count.programs} programs</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
