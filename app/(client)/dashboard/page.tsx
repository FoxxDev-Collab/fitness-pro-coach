import { getMyAssignments, getMyProfile } from "@/lib/actions/client-portal";
import Link from "next/link";
import { Play, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ClientDashboard() {
  const [profile, assignments] = await Promise.all([
    getMyProfile(),
    getMyAssignments(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{profile?.name ? `, ${profile.name}` : ""}
        </h1>
        {profile?.coach?.name && (
          <p className="text-sm text-muted-foreground">
            Coach: {profile.coach.name}
          </p>
        )}
      </div>

      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="size-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No programs assigned yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your coach will assign workout programs for you
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <CardTitle className="text-lg">{assignment.name}</CardTitle>
                <CardDescription>
                  {assignment.workouts.length} workouts · {assignment.logs.length} sessions logged
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assignment.workouts.map((workout, idx) => {
                    const lastLog = assignment.logs.find(
                      (l) => l.workoutIndex === idx
                    );
                    return (
                      <div
                        key={workout.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium text-sm">{workout.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workout.exercises.length} exercises
                            {lastLog && (
                              <> · Last: {new Date(lastLog.date).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <Button size="sm" asChild>
                          <Link href={`/workout/${assignment.id}/${idx}`}>
                            <Play className="size-3.5 mr-1.5" />
                            Start
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
