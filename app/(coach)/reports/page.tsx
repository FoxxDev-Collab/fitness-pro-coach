import { db } from "@/lib/db";
import { getCoachId } from "@/lib/auth-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReportsClientView } from "./reports-client";
import { AdherenceView } from "./adherence-view";
import { getAdherenceDashboard } from "@/lib/actions/adherence";

type Client = {
  id: string;
  name: string;
  active: boolean;
};

type Assignment = {
  id: string;
  clientId: string | null;
  workouts: {
    exercises: {
      name: string;
      type: string;
    }[];
  }[];
};

type SessionLog = {
  id: string;
  assignmentId: string;
  date: Date;
  duration: number | null;
  exercises: {
    exerciseIndex: number;
    weight: number | null;
    setDetails: {
      weight: number | null;
      reps: number | null;
    }[];
  }[];
};

export default async function ReportsPage() {
  const coachId = await getCoachId();

  const [clients, assignments, logs, adherence]: [Client[], Assignment[], SessionLog[], Awaited<ReturnType<typeof getAdherenceDashboard>>] = await Promise.all([
    db.client.findMany({
      where: { coachId },
      orderBy: { name: "asc" },
    }),
    db.assignment.findMany({
      where: { client: { coachId } },
      include: {
        workouts: {
          include: {
            exercises: true,
          },
        },
      },
    }),
    db.sessionLog.findMany({
      where: { assignment: { client: { coachId } } },
      include: {
        exercises: {
          include: {
            setDetails: true,
          },
        },
      },
      orderBy: { date: "desc" },
    }),
    getAdherenceDashboard(),
  ]);

  const clientStats = clients.map((c: Client) => {
    const clientAssignments = assignments.filter((a: Assignment) => a.clientId === c.id);
    const clientLogs = logs.filter((l: SessionLog) =>
      clientAssignments.some((a: Assignment) => a.id === l.assignmentId)
    );
    const recentLogs = clientLogs.filter(
      (l: SessionLog) => new Date(l.date).getTime() > Date.now() - 604800000
    );

    return {
      ...c,
      totalLogs: clientLogs.length,
      recentLogs: recentLogs.length,
      totalMinutes: clientLogs.reduce((sum: number, l: SessionLog) => sum + (l.duration || 0), 0),
    };
  });

  const activeClients = clients.filter((c: Client) => c.active).length;
  const totalSessions = logs.length;
  const totalMinutes = logs.reduce((sum: number, l: SessionLog) => sum + (l.duration || 0), 0);
  const thisWeekSessions = logs.filter(
    (l: SessionLog) => new Date(l.date).getTime() > Date.now() - 604800000
  ).length;

  const stats = [
    { label: "Active Clients", value: activeClients },
    { label: "Total Sessions", value: totalSessions },
    { label: "Total Minutes", value: totalMinutes },
    { label: "This Week", value: thisWeekSessions },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Overview of training activity</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {clients.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Add clients to see reports
        </p>
      ) : (
        <Tabs defaultValue="progress">
          <TabsList>
            <TabsTrigger value="progress">Client Progress</TabsTrigger>
            <TabsTrigger value="adherence">Adherence</TabsTrigger>
          </TabsList>
          <TabsContent value="progress" className="mt-4">
            <ReportsClientView clientStats={clientStats} assignments={assignments} logs={logs} />
          </TabsContent>
          <TabsContent value="adherence" className="mt-4">
            <AdherenceView data={adherence} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
