"use client";

import { useState } from "react";
import { Compass, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { NotificationToggle } from "@/components/pwa/notification-toggle";
import { AthleteRaces } from "@/app/(coach)/teams/[id]/results-tab";
import {
  PortalSchedule,
  PortalTeamScores,
  PortalAnnouncements,
} from "@/components/portal/portal-views";
import { portalSignOut } from "@/lib/actions/portal";
import type { PortalDashboard } from "@/lib/portal/dashboard-types";

export function PortalDashboardView({ dashboard }: { dashboard: PortalDashboard }) {
  const { athletes } = dashboard;
  const [selectedId, setSelectedId] = useState(athletes[0]?.athlete.id ?? "");
  const current = athletes.find((a) => a.athlete.id === selectedId) ?? athletes[0];

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Praevio</span>
          </div>
          <div className="flex items-center gap-1">
            <InstallAppButton />
            <NotificationToggle />
            <ThemeToggle />
            <form action={portalSignOut}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {!current ? null : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold">
                  {current.athlete.name}
                </h1>
                <p className="truncate text-sm text-muted-foreground">
                  {current.team.name}
                  {current.team.season ? ` · ${current.team.season}` : ""}
                </p>
              </div>
              {athletes.length > 1 && (
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-auto min-w-40">
                    <Users className="size-4 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes.map((a) => (
                      <SelectItem key={a.athlete.id} value={a.athlete.id}>
                        {a.athlete.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="news">News</TabsTrigger>
              </TabsList>

              <TabsContent value="schedule" className="mt-5">
                <PortalSchedule events={current.events} />
              </TabsContent>
              <TabsContent value="results" className="mt-5">
                <AthleteRaces rows={current.races} />
              </TabsContent>
              <TabsContent value="team" className="mt-5">
                <PortalTeamScores meets={current.teamScores} />
              </TabsContent>
              <TabsContent value="news" className="mt-5">
                <PortalAnnouncements items={current.announcements} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
