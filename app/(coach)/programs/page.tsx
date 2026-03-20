import { getPrograms } from "@/lib/actions/programs";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgramCard } from "./program-card";

export default async function ProgramsPage() {
  const programs = await getPrograms();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Programs</h1>
          <p className="text-sm text-muted-foreground">
            {programs.length} program{programs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/programs/new">
            <Plus className="size-4 mr-2" />
            New Program
          </Link>
        </Button>
      </div>

      {programs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="size-10 text-muted-foreground mb-3" />
            <h3 className="font-medium text-muted-foreground mb-1">
              No programs yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first workout program to get started
            </p>
            <Button asChild>
              <Link href="/programs/new">
                <Plus className="size-4 mr-2" />
                Create Program
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      )}
    </div>
  );
}
