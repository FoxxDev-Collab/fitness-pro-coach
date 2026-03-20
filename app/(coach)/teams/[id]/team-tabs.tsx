"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Play,
  Calendar,
  Megaphone,
  Users,
  ClipboardList,
  MapPin,
  Edit2,
  LayoutDashboard,
  TrendingUp,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Pin,
  Archive,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  addAthlete,
  updateAthlete,
  removeAthlete,
  assignProgramToTeam,
  deleteTeamAssignment,
} from "@/lib/actions/teams";
import { createEvent, deleteEvent } from "@/lib/actions/team-events";
import {
  createAnnouncement,
  deleteAnnouncement,
} from "@/lib/actions/team-announcements";
import {
  createTeamNote,
  updateTeamNote,
  deleteTeamNote,
  togglePinTeamNote,
} from "@/lib/actions/team-notes";
import {
  createAthleteNote,
  updateAthleteNote,
  deleteAthleteNote,
  togglePinAthleteNote,
  getAthleteNotes,
} from "@/lib/actions/athlete-notes";
import {
  createMetricDefinition,
  archiveMetricDefinition,
  recordMetricEntry,
  deleteMetricEntry,
  getAthleteMetricSummary,
} from "@/lib/actions/metrics";
import { MetricChart } from "@/components/charts/metric-chart";

// ─── Types ──────────────────────────────────────────────────

type Athlete = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  jerseyNumber: string | null;
  notes: string | null;
  active: boolean;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  assignments: {
    id: string;
    name: string;
    program: { name: string };
    logs: { date: Date }[];
  }[];
};

type TeamAssignmentType = {
  id: string;
  name: string;
  assignedAt: Date;
  program: { name: string };
  assignments: {
    id: string;
    athlete: { id: string; name: string } | null;
    logs: { date: Date }[];
  }[];
};

type TeamEvent = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  location: string | null;
  opponent: string | null;
  startTime: Date;
  endTime: Date | null;
  allDay: boolean;
};

type Announcement = {
  id: string;
  subject: string;
  body: string;
  sentAt: Date;
};

type TeamNote = {
  id: string;
  content: string;
  pinned: boolean;
  category: string;
  createdAt: Date;
  coach: { name: string | null };
};

type MetricDef = {
  id: string;
  name: string;
  unit: string;
  scope: string;
  description: string | null;
};

type MetricEntryType = {
  id: string;
  value: number;
  notes: string | null;
  date: Date;
  metricDefinition: MetricDef;
  athlete: { id: string; name: string } | null;
  event: { id: string; title: string; type: string; startTime: Date } | null;
};

type AthleteNoteType = {
  id: string;
  content: string;
  pinned: boolean;
  category: string;
  createdAt: Date;
  coach: { name: string | null };
};

type DashboardData = {
  athleteCount: number;
  totalSessions: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  athleteStats: {
    id: string;
    name: string;
    totalSessions: number;
    sessionsThisWeek: number;
    lastSessionDate: Date | null;
  }[];
  weeklyActivity: { week: string; count: number }[];
  programCompletion: { id: string; name: string; total: number; started: number }[];
  upcomingEvents: TeamEvent[];
};

type Team = {
  id: string;
  name: string;
  athletes: Athlete[];
  teamAssignments: TeamAssignmentType[];
  events: TeamEvent[];
  announcements: Announcement[];
  notes: TeamNote[];
};

// ─── Root Component ─────────────────────────────────────────

export function TeamTabs({
  team,
  dashboard,
  notes,
  metricDefinitions,
  teamMetricEntries,
  athleteMetricEntries,
}: {
  team: Team;
  dashboard: DashboardData;
  notes: TeamNote[];
  metricDefinitions: MetricDef[];
  teamMetricEntries: MetricEntryType[];
  athleteMetricEntries: MetricEntryType[];
}) {
  return (
    <Tabs defaultValue="dashboard">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="dashboard" className="gap-1.5">
          <LayoutDashboard className="size-3.5" /> Dashboard
        </TabsTrigger>
        <TabsTrigger value="roster" className="gap-1.5">
          <Users className="size-3.5" /> Roster
        </TabsTrigger>
        <TabsTrigger value="schedule" className="gap-1.5">
          <Calendar className="size-3.5" /> Schedule
        </TabsTrigger>
        <TabsTrigger value="programs" className="gap-1.5">
          <ClipboardList className="size-3.5" /> Programs
        </TabsTrigger>
        <TabsTrigger value="metrics" className="gap-1.5">
          <TrendingUp className="size-3.5" /> Metrics
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-1.5">
          <StickyNote className="size-3.5" /> Notes
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        <DashboardTab dashboard={dashboard} />
      </TabsContent>
      <TabsContent value="roster">
        <RosterTab
          teamId={team.id}
          athletes={team.athletes}
          events={team.events}
          metricDefinitions={metricDefinitions}
          athleteMetricEntries={athleteMetricEntries}
        />
      </TabsContent>
      <TabsContent value="schedule">
        <ScheduleTab teamId={team.id} events={team.events} />
      </TabsContent>
      <TabsContent value="programs">
        <ProgramsTab
          teamId={team.id}
          teamName={team.name}
          teamAssignments={team.teamAssignments}
        />
      </TabsContent>
      <TabsContent value="metrics">
        <MetricsTab
          teamId={team.id}
          athletes={team.athletes}
          events={team.events}
          metricDefinitions={metricDefinitions}
          teamMetricEntries={teamMetricEntries}
          athleteMetricEntries={athleteMetricEntries}
        />
      </TabsContent>
      <TabsContent value="notes">
        <NotesTab teamId={team.id} notes={notes} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────

function DashboardTab({ dashboard }: { dashboard: DashboardData }) {
  const formatDate = (d: Date | null) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const weeklyChartData = dashboard.weeklyActivity.map((w) => ({
    date: w.week,
    value: w.count,
  }));

  const sortedLeaderboard = [...dashboard.athleteStats].sort(
    (a, b) => b.totalSessions - a.totalSessions
  );

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Athletes</p>
            <p className="text-2xl font-bold">{dashboard.athleteCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">This Week</p>
            <p className="text-2xl font-bold">{dashboard.sessionsThisWeek}</p>
            <p className="text-xs text-muted-foreground">sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="text-2xl font-bold">{dashboard.sessionsThisMonth}</p>
            <p className="text-xs text-muted-foreground">sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Total Sessions</p>
            <p className="text-2xl font-bold">{dashboard.totalSessions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      {weeklyChartData.length > 0 && (
        <MetricChart
          title="Weekly Activity"
          unit="sessions"
          data={weeklyChartData}
          type="bar"
          height={160}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Athlete Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Athlete Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedLeaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No session data yet
              </p>
            ) : (
              <div className="space-y-2">
                {sortedLeaderboard.map((a, i) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 py-1"
                  >
                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                      {i + 1}
                    </span>
                    <span
                      className={`size-2 rounded-full shrink-0 ${
                        a.sessionsThisWeek > 0
                          ? "bg-green-500"
                          : "bg-red-400"
                      }`}
                    />
                    <span className="text-sm flex-1 min-w-0 truncate">
                      {a.name}
                    </span>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">
                        {a.totalSessions} sessions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last: {formatDate(a.lastSessionDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Program Completion + Upcoming Events */}
        <div className="space-y-4">
          {/* Program Completion */}
          {dashboard.programCompletion.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Program Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.programCompletion.map((p) => {
                    const pct =
                      p.total > 0
                        ? Math.round((p.started / p.total) * 100)
                        : 0;
                    return (
                      <div key={p.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs truncate flex-1 mr-2">
                            {p.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {p.started}/{p.total}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          {dashboard.upcomingEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard.upcomingEvents.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-start gap-2">
                      <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Calendar className="size-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {e.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.startTime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Roster Tab ─────────────────────────────────────────────

function RosterTab({
  teamId,
  athletes,
  events,
  metricDefinitions,
  athleteMetricEntries,
}: {
  teamId: string;
  athletes: Athlete[];
  events: TeamEvent[];
  metricDefinitions: MetricDef[];
  athleteMetricEntries: MetricEntryType[];
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      await removeAthlete(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {athletes.length} athlete{athletes.length !== 1 ? "s" : ""}
        </p>
        <AthleteFormDialog teamId={teamId}>
          <Button size="sm">
            <Plus className="size-4 mr-1.5" /> Add Athlete
          </Button>
        </AthleteFormDialog>
      </div>

      {athletes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No athletes on this team
            </p>
            <AthleteFormDialog teamId={teamId}>
              <Button size="sm">
                <Plus className="size-4 mr-1.5" /> Add First Athlete
              </Button>
            </AthleteFormDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {athletes.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card overflow-hidden">
              {/* Athlete Row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(a.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    {a.jerseyNumber && (
                      <Badge variant="outline">#{a.jerseyNumber}</Badge>
                    )}
                    {!a.active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {a.position && `${a.position} · `}
                    {a.email || "No email"}
                    {a.parentEmail && ` · Parent: ${a.parentEmail}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <AthleteFormDialog teamId={teamId} athlete={a}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                  </AthleteFormDialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    disabled={removing === a.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(a.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  {expandedId === a.id ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Detail Panel */}
              {expandedId === a.id && (
                <div className="border-t bg-muted/20">
                  <AthleteDetailPanel
                    athlete={a}
                    events={events}
                    metricDefinitions={metricDefinitions.filter(
                      (m) => m.scope === "ATHLETE"
                    )}
                    existingEntries={athleteMetricEntries.filter(
                      (e) => e.athlete?.id === a.id
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Athlete Detail Panel ───────────────────────────────────

function AthleteDetailPanel({
  athlete,
  events,
  metricDefinitions,
  existingEntries,
}: {
  athlete: Athlete;
  events: TeamEvent[];
  metricDefinitions: MetricDef[];
  existingEntries: MetricEntryType[];
}) {
  const [activeSection, setActiveSection] = useState<
    "info" | "notes" | "metrics"
  >("info");
  const [notes, setNotes] = useState<AthleteNoteType[] | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (activeSection === "notes" && notes === null) {
      setLoadingNotes(true);
      getAthleteNotes(athlete.id)
        .then((result) => setNotes(result as AthleteNoteType[]))
        .catch(console.error)
        .finally(() => setLoadingNotes(false));
    }
  }, [activeSection, athlete.id, notes]);

  const refreshNotes = () => {
    setLoadingNotes(true);
    getAthleteNotes(athlete.id)
      .then((result) => setNotes(result as AthleteNoteType[]))
      .catch(console.error)
      .finally(() => setLoadingNotes(false));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Section Toggle */}
      <div className="flex gap-2">
        {(["info", "notes", "metrics"] as const).map((s) => (
          <Button
            key={s}
            variant={activeSection === s ? "default" : "outline"}
            size="sm"
            className="capitalize"
            onClick={() => setActiveSection(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Info Section */}
      {activeSection === "info" && (
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          {athlete.phone && (
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p>{athlete.phone}</p>
            </div>
          )}
          {athlete.email && (
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p>{athlete.email}</p>
            </div>
          )}
          {athlete.parentName && (
            <div>
              <p className="text-xs text-muted-foreground">Parent / Guardian</p>
              <p>{athlete.parentName}</p>
              {athlete.parentEmail && (
                <p className="text-muted-foreground text-xs">
                  {athlete.parentEmail}
                </p>
              )}
              {athlete.parentPhone && (
                <p className="text-muted-foreground text-xs">
                  {athlete.parentPhone}
                </p>
              )}
            </div>
          )}
          {athlete.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="whitespace-pre-wrap">{athlete.notes}</p>
            </div>
          )}
          {athlete.assignments.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">
                Program Assignments
              </p>
              <div className="space-y-1">
                {athlete.assignments.map((as) => (
                  <div
                    key={as.id}
                    className="flex items-center justify-between bg-background rounded px-3 py-1.5 border"
                  >
                    <span>{as.program.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {as.logs.length} sessions
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={`/session/${as.id}/0`}>
                          <Play className="size-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes Section */}
      {activeSection === "notes" && (
        <AthleteNotesSection
          athleteId={athlete.id}
          notes={notes}
          loading={loadingNotes}
          onRefresh={refreshNotes}
        />
      )}

      {/* Metrics Section */}
      {activeSection === "metrics" && (
        <AthleteMetricsSection
          athleteId={athlete.id}
          events={events}
          metricDefinitions={metricDefinitions}
          existingEntries={existingEntries}
        />
      )}
    </div>
  );
}

// ─── Athlete Notes Section ──────────────────────────────────

const NOTE_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "GAME", label: "Game" },
  { value: "PRACTICE", label: "Practice" },
  { value: "MEETING", label: "Meeting" },
  { value: "SCOUTING", label: "Scouting" },
] as const;

const NOTE_CATEGORY_COLORS: Record<string, string> = {
  GENERAL: "bg-gray-500/10 text-gray-500",
  GAME: "bg-red-500/10 text-red-500",
  PRACTICE: "bg-blue-500/10 text-blue-500",
  MEETING: "bg-yellow-500/10 text-yellow-500",
  SCOUTING: "bg-purple-500/10 text-purple-500",
};

function AthleteNotesSection({
  athleteId,
  notes,
  loading,
  onRefresh,
}: {
  athleteId: string;
  notes: AthleteNoteType[] | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("GENERAL");

  const handleCreate = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await createAthleteNote(athleteId, content.trim(), category as "GENERAL");
      setContent("");
      setCategory("GENERAL");
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note: AthleteNoteType) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditCategory(note.category);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      await updateAthleteNote(
        editingId,
        editContent.trim(),
        editCategory as "GENERAL"
      );
      setEditingId(null);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAthleteNote(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await togglePinAthleteNote(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compose */}
      <div className="space-y-2">
        <Textarea
          rows={2}
          placeholder="Add a note about this athlete..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!content.trim() || saving}
          >
            {saving ? "Saving..." : "Add Note"}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Loading notes...
        </p>
      ) : notes === null || notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No notes yet
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border bg-background p-3 space-y-2"
            >
              {editingId === note.id ? (
                <>
                  <Textarea
                    rows={2}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTogglePin(note.id)}
                        className={`p-1 rounded hover:bg-muted transition-colors ${
                          note.pinned
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Pin className="size-3" />
                      </button>
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <Edit2 className="size-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1 rounded hover:bg-muted transition-colors text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        NOTE_CATEGORY_COLORS[note.category] ||
                        NOTE_CATEGORY_COLORS.GENERAL
                      }`}
                    >
                      {note.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {note.pinned && (
                      <Badge variant="outline" className="text-xs py-0">
                        Pinned
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Athlete Metrics Section ────────────────────────────────

function AthleteMetricsSection({
  athleteId,
  events,
  metricDefinitions,
  existingEntries,
}: {
  athleteId: string;
  events: TeamEvent[];
  metricDefinitions: MetricDef[];
  existingEntries: MetricEntryType[];
}) {
  const router = useRouter();
  const [selectedMetricId, setSelectedMetricId] = useState("");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventId, setEventId] = useState("none");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleRecord = async () => {
    if (!selectedMetricId || !value) return;
    setSaving(true);
    try {
      await recordMetricEntry({
        metricDefinitionId: selectedMetricId,
        athleteId,
        eventId: eventId !== "none" ? eventId : undefined,
        value: parseFloat(value),
        notes: notes || undefined,
        date: new Date(date),
      });
      setValue("");
      setNotes("");
      setEventId("none");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Group entries by metric definition
  const entriesByMetric = metricDefinitions.reduce<
    Record<string, MetricEntryType[]>
  >((acc, def) => {
    acc[def.id] = existingEntries
      .filter((e) => e.metricDefinition.id === def.id)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {metricDefinitions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No athlete metric definitions yet. Create them in the Metrics tab.
        </p>
      ) : (
        <>
          {/* Record Entry */}
          <div className="space-y-2 p-3 rounded-lg border bg-background">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Record Entry
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Select
                  value={selectedMetricId}
                  onValueChange={setSelectedMetricId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric..." />
                  </SelectTrigger>
                  <SelectContent>
                    {metricDefinitions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number"
                placeholder="Value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {events.length > 0 && (
                <div className="col-span-2">
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Link to event (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event</SelectItem>
                      {events.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.title} —{" "}
                          {new Date(ev.startTime).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleRecord}
              disabled={!selectedMetricId || !value || saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Record Entry"}
            </Button>
          </div>

          {/* Existing Entries by Metric */}
          {metricDefinitions.map((def) => {
            const entries = entriesByMetric[def.id] || [];
            if (entries.length === 0) return null;
            const chartData = entries.map((e) => ({
              date: new Date(e.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              value: e.value,
            }));
            return (
              <div key={def.id}>
                <MetricChart
                  title={def.name}
                  unit={def.unit}
                  data={chartData}
                  type="line"
                  height={120}
                />
                <div className="mt-1 space-y-1">
                  {[...entries].reverse().slice(0, 5).map((entry) => (
                    <AthleteMetricEntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function AthleteMetricEntryRow({ entry }: { entry: MetricEntryType }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMetricEntry(entry.id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-muted/50">
      <span className="text-muted-foreground">
        {new Date(entry.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
      <span className="font-medium">
        {entry.value} {entry.metricDefinition.unit}
      </span>
      {entry.notes && (
        <span className="text-muted-foreground truncate max-w-[100px]">
          {entry.notes}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive"
        disabled={deleting}
        onClick={handleDelete}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}

// ─── Athlete Form Dialog ────────────────────────────────────

function AthleteFormDialog({
  teamId,
  athlete,
  children,
}: {
  teamId: string;
  athlete?: Athlete;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: athlete?.name || "",
    email: athlete?.email || "",
    phone: athlete?.phone || "",
    position: athlete?.position || "",
    jerseyNumber: athlete?.jerseyNumber || "",
    notes: athlete?.notes || "",
    parentName: athlete?.parentName || "",
    parentEmail: athlete?.parentEmail || "",
    parentPhone: athlete?.parentPhone || "",
  });

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const cleaned = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        position: form.position || undefined,
        jerseyNumber: form.jerseyNumber || undefined,
        notes: form.notes || undefined,
        parentName: form.parentName || undefined,
        parentEmail: form.parentEmail || undefined,
        parentPhone: form.parentPhone || undefined,
      };
      if (athlete) {
        await updateAthlete(athlete.id, cleaned);
      } else {
        await addAthlete(teamId, cleaned);
      }
      setOpen(false);
      if (!athlete) {
        setForm({
          name: "",
          email: "",
          phone: "",
          position: "",
          jerseyNumber: "",
          notes: "",
          parentName: "",
          parentEmail: "",
          parentPhone: "",
        });
      }
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{athlete ? "Edit Athlete" : "Add Athlete"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              placeholder="Athlete name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Position</Label>
              <Input
                placeholder="e.g. QB, Forward"
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
              />
            </div>
            <div>
              <Label>Jersey #</Label>
              <Input
                placeholder="e.g. 12"
                value={form.jerseyNumber}
                onChange={(e) => set("jerseyNumber", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="athlete@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Parent / Guardian Contact</p>
            <div className="space-y-3">
              <div>
                <Label>Parent Name</Label>
                <Input
                  placeholder="Parent/guardian name"
                  value={form.parentName}
                  onChange={(e) => set("parentName", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Parent Email</Label>
                  <Input
                    type="email"
                    placeholder="parent@email.com"
                    value={form.parentEmail}
                    onChange={(e) => set("parentEmail", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Parent Phone</Label>
                  <Input
                    placeholder="Phone number"
                    value={form.parentPhone}
                    onChange={(e) => set("parentPhone", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              placeholder="Any notes about this athlete"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!form.name || saving}
            className="w-full"
          >
            {saving ? "Saving..." : athlete ? "Save" : "Add Athlete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Schedule Tab ───────────────────────────────────────────

function ScheduleTab({
  teamId,
  events,
}: {
  teamId: string;
  events: TeamEvent[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startTime) >= now);
  const past = events.filter((e) => new Date(e.startTime) < now).reverse();

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteEvent(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const typeColors: Record<string, string> = {
    PRACTICE: "bg-blue-500/10 text-blue-500",
    GAME: "bg-red-500/10 text-red-500",
    MEETING: "bg-yellow-500/10 text-yellow-500",
    TRYOUT: "bg-purple-500/10 text-purple-500",
    CAMP: "bg-green-500/10 text-green-500",
    FUNDRAISER: "bg-orange-500/10 text-orange-500",
    OTHER: "bg-gray-500/10 text-gray-500",
  };

  const renderEvent = (e: TeamEvent) => (
    <div
      key={e.id}
      className="flex items-start justify-between rounded-lg border bg-card p-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              typeColors[e.type] || typeColors.OTHER
            }`}
          >
            {e.type}
          </span>
          <p className="font-medium">{e.title}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(e.startTime)}
          {!e.allDay && ` at ${formatTime(e.startTime)}`}
          {e.endTime && !e.allDay && ` - ${formatTime(e.endTime)}`}
        </p>
        {e.location && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="size-3" /> {e.location}
          </p>
        )}
        {e.opponent && (
          <p className="text-sm text-muted-foreground mt-0.5">
            vs. {e.opponent}
          </p>
        )}
        {e.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {e.description}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive shrink-0"
        disabled={deleting === e.id}
        onClick={() => handleDelete(e.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {upcoming.length} upcoming event{upcoming.length !== 1 ? "s" : ""}
        </p>
        <EventFormDialog teamId={teamId}>
          <Button size="sm">
            <Plus className="size-4 mr-1.5" /> Add Event
          </Button>
        </EventFormDialog>
      </div>

      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Calendar className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No events scheduled
            </p>
            <EventFormDialog teamId={teamId}>
              <Button size="sm">
                <Plus className="size-4 mr-1.5" /> Schedule First Event
              </Button>
            </EventFormDialog>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Upcoming</p>
              {upcoming.map(renderEvent)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Past</p>
              {past.map(renderEvent)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Event Form Dialog ──────────────────────────────────────

const EVENT_TYPES = [
  { value: "PRACTICE", label: "Practice" },
  { value: "GAME", label: "Game" },
  { value: "MEETING", label: "Meeting" },
  { value: "TRYOUT", label: "Tryout" },
  { value: "CAMP", label: "Camp" },
  { value: "FUNDRAISER", label: "Fundraiser" },
  { value: "OTHER", label: "Other" },
] as const;

function EventFormDialog({
  teamId,
  children,
}: {
  teamId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "PRACTICE" as string,
    description: "",
    location: "",
    opponent: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "",
    allDay: false,
    notifyParents: true,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const startTime = form.allDay
        ? new Date(`${form.date}T00:00:00`)
        : new Date(`${form.date}T${form.startTime}:00`);
      const endTime =
        form.endTime && !form.allDay
          ? new Date(`${form.date}T${form.endTime}:00`)
          : undefined;

      await createEvent(teamId, {
        title: form.title,
        type: form.type as "PRACTICE",
        description: form.description || undefined,
        location: form.location || undefined,
        opponent: form.opponent || undefined,
        startTime,
        endTime,
        allDay: form.allDay,
        notifyParents: form.notifyParents,
      });
      setOpen(false);
      setForm({
        title: "",
        type: "PRACTICE",
        description: "",
        location: "",
        opponent: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "",
        allDay: false,
        notifyParents: true,
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Practice, Game vs. Eagles"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="allDay"
              checked={form.allDay}
              onCheckedChange={(c) => set("allDay", !!c)}
            />
            <Label htmlFor="allDay" className="cursor-pointer">
              All day event
            </Label>
          </div>
          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                />
              </div>
            </div>
          )}
          <div>
            <Label>Location</Label>
            <Input
              placeholder="e.g. Main Field, Gym"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          {form.type === "GAME" && (
            <div>
              <Label>Opponent</Label>
              <Input
                placeholder="e.g. Eagles"
                value={form.opponent}
                onChange={(e) => set("opponent", e.target.value)}
              />
            </div>
          )}
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="Additional details..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="notify"
              checked={form.notifyParents}
              onCheckedChange={(c) => set("notifyParents", !!c)}
            />
            <Label htmlFor="notify" className="cursor-pointer">
              Notify athletes & parents via email
            </Label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!form.title || saving}
            className="w-full"
          >
            {saving ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Programs Tab ───────────────────────────────────────────

function ProgramsTab({
  teamId,
  teamName,
  teamAssignments,
}: {
  teamId: string;
  teamName: string;
  teamAssignments: TeamAssignmentType[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteTeamAssignment(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {teamAssignments.length} program
          {teamAssignments.length !== 1 ? "s" : ""} assigned
        </p>
        <AssignToTeamDialog teamId={teamId} teamName={teamName}>
          <Button size="sm">
            <Plus className="size-4 mr-1.5" /> Assign Program
          </Button>
        </AssignToTeamDialog>
      </div>

      {teamAssignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ClipboardList className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No programs assigned
            </p>
            <AssignToTeamDialog teamId={teamId} teamName={teamName}>
              <Button size="sm">
                <Plus className="size-4 mr-1.5" /> Assign First Program
              </Button>
            </AssignToTeamDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teamAssignments.map((ta) => {
            const completedCount = ta.assignments.filter(
              (a) => a.logs.length > 0
            ).length;
            return (
              <Card key={ta.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {ta.program.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Assigned{" "}
                        {new Date(ta.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      disabled={deleting === ta.id}
                      onClick={() => handleDelete(ta.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {completedCount}/{ta.assignments.length} athletes started
                  </p>
                  <div className="space-y-1">
                    {ta.assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <span>{a.athlete?.name || "Unknown"}</span>
                        <div className="flex items-center gap-2">
                          {a.logs.length > 0 ? (
                            <Badge variant="default" className="text-xs">
                              {a.logs.length} session
                              {a.logs.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Not started
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                          >
                            <a href={`/session/${a.id}/0`}>
                              <Play className="size-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Assign to Team Dialog ──────────────────────────────────

type Program = {
  id: string;
  name: string;
  workouts: { id: string }[];
};

function AssignToTeamDialog({
  teamId,
  teamName,
  children,
}: {
  teamId: string;
  teamName: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch("/api/programs")
        .then((res) => res.json())
        .then(setPrograms)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedProgram) return;
    setSaving(true);
    try {
      await assignProgramToTeam({
        teamId,
        programId: selectedProgram.id,
        name: `${selectedProgram.name} - ${teamName}`,
        startDate: new Date(startDate),
      });
      setOpen(false);
      setSelectedProgram(null);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedProgram ? "Assign to Team" : "Select Program"}
          </DialogTitle>
        </DialogHeader>

        {selectedProgram ? (
          <div className="space-y-4">
            <p>
              Assigning <strong>{selectedProgram.name}</strong> to all athletes
              on <strong>{teamName}</strong>
            </p>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedProgram(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleAssign}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Assigning..." : "Assign to Team"}
              </Button>
            </div>
          </div>
        ) : loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : programs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No programs available. Create a program first.
          </p>
        ) : (
          <div className="space-y-2">
            {programs.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProgram(p)}
                className="w-full bg-muted hover:bg-muted/80 rounded p-3 text-left transition"
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.workouts?.length || 0} workouts
                </p>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Metrics Tab ────────────────────────────────────────────

function MetricsTab({
  teamId,
  athletes,
  events,
  metricDefinitions,
  teamMetricEntries,
  athleteMetricEntries,
}: {
  teamId: string;
  athletes: Athlete[];
  events: TeamEvent[];
  metricDefinitions: MetricDef[];
  teamMetricEntries: MetricEntryType[];
  athleteMetricEntries: MetricEntryType[];
}) {
  const router = useRouter();

  // Definition creation
  const [defName, setDefName] = useState("");
  const [defUnit, setDefUnit] = useState("");
  const [defScope, setDefScope] = useState<"TEAM" | "ATHLETE">("TEAM");
  const [defDescription, setDefDescription] = useState("");
  const [creatingDef, setCreatingDef] = useState(false);
  const [showDefForm, setShowDefForm] = useState(false);

  // Entry recording
  const [entryScope, setEntryScope] = useState<"TEAM" | "ATHLETE">("TEAM");
  const [entryAthleteId, setEntryAthleteId] = useState("none");
  const [entryMetricId, setEntryMetricId] = useState("");
  const [entryValue, setEntryValue] = useState("");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [entryEventId, setEntryEventId] = useState("none");
  const [entryNotes, setEntryNotes] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);

  const teamMetricDefs = metricDefinitions.filter((m) => m.scope === "TEAM");
  const athleteMetricDefs = metricDefinitions.filter(
    (m) => m.scope === "ATHLETE"
  );
  const scopedDefs = entryScope === "TEAM" ? teamMetricDefs : athleteMetricDefs;

  const handleCreateDef = async () => {
    if (!defName.trim() || !defUnit.trim()) return;
    setCreatingDef(true);
    try {
      await createMetricDefinition({
        name: defName.trim(),
        unit: defUnit.trim(),
        scope: defScope,
        description: defDescription.trim() || undefined,
      });
      setDefName("");
      setDefUnit("");
      setDefScope("TEAM");
      setDefDescription("");
      setShowDefForm(false);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingDef(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveMetricDefinition(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordEntry = async () => {
    if (!entryMetricId || !entryValue) return;
    if (entryScope === "ATHLETE" && entryAthleteId === "none") return;
    setSavingEntry(true);
    try {
      await recordMetricEntry({
        metricDefinitionId: entryMetricId,
        teamId: entryScope === "TEAM" ? teamId : undefined,
        athleteId:
          entryScope === "ATHLETE" ? entryAthleteId : undefined,
        eventId: entryEventId !== "none" ? entryEventId : undefined,
        value: parseFloat(entryValue),
        notes: entryNotes || undefined,
        date: new Date(entryDate),
      });
      setEntryValue("");
      setEntryNotes("");
      setEntryEventId("none");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteMetricEntry(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const allEntries = [...teamMetricEntries, ...athleteMetricEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Metric Definitions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Metric Definitions</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDefForm((v) => !v)}
          >
            <Plus className="size-4 mr-1.5" />{" "}
            {showDefForm ? "Cancel" : "New Metric"}
          </Button>
        </div>

        {showDefForm && (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g. Sprint Time"
                    value={defName}
                    onChange={(e) => setDefName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Unit *</Label>
                  <Input
                    placeholder="e.g. seconds, kg"
                    value={defUnit}
                    onChange={(e) => setDefUnit(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Scope</Label>
                <Select
                  value={defScope}
                  onValueChange={(v) => setDefScope(v as "TEAM" | "ATHLETE")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEAM">Team</SelectItem>
                    <SelectItem value="ATHLETE">Athlete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Optional description"
                  value={defDescription}
                  onChange={(e) => setDefDescription(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                onClick={handleCreateDef}
                disabled={!defName.trim() || !defUnit.trim() || creatingDef}
                className="w-full"
              >
                {creatingDef ? "Creating..." : "Create Metric"}
              </Button>
            </CardContent>
          </Card>
        )}

        {metricDefinitions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No metric definitions yet. Create one above.
          </p>
        ) : (
          <div className="space-y-1">
            {metricDefinitions.map((def) => (
              <div
                key={def.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{def.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {def.unit}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                    >
                      {def.scope}
                    </Badge>
                  </div>
                  {def.description && (
                    <p className="text-xs text-muted-foreground">
                      {def.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => handleArchive(def.id)}
                  title="Archive metric"
                >
                  <Archive className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Record Entry */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Record Entry</h3>
        <div className="space-y-3 p-4 rounded-lg border bg-card">
          {/* Scope Toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={entryScope === "TEAM" ? "default" : "outline"}
              onClick={() => {
                setEntryScope("TEAM");
                setEntryMetricId("");
                setEntryAthleteId("none");
              }}
            >
              Team
            </Button>
            <Button
              size="sm"
              variant={entryScope === "ATHLETE" ? "default" : "outline"}
              onClick={() => {
                setEntryScope("ATHLETE");
                setEntryMetricId("");
              }}
            >
              Athlete
            </Button>
          </div>

          {entryScope === "ATHLETE" && (
            <div>
              <Label>Athlete</Label>
              <Select value={entryAthleteId} onValueChange={setEntryAthleteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select athlete..." />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Metric</Label>
            {scopedDefs.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">
                No {entryScope.toLowerCase()} metrics defined yet.
              </p>
            ) : (
              <Select value={entryMetricId} onValueChange={setEntryMetricId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metric..." />
                </SelectTrigger>
                <SelectContent>
                  {scopedDefs.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                placeholder="e.g. 4.85"
                value={entryValue}
                onChange={(e) => setEntryValue(e.target.value)}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
          </div>

          {events.length > 0 && (
            <div>
              <Label>Link to Event (optional)</Label>
              <Select value={entryEventId} onValueChange={setEntryEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="No event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No event</SelectItem>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title} —{" "}
                      {new Date(ev.startTime).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Notes (optional)</Label>
            <Input
              placeholder="Any notes about this entry"
              value={entryNotes}
              onChange={(e) => setEntryNotes(e.target.value)}
            />
          </div>

          <Button
            onClick={handleRecordEntry}
            disabled={
              !entryMetricId ||
              !entryValue ||
              (entryScope === "ATHLETE" && entryAthleteId === "none") ||
              savingEntry
            }
            className="w-full"
          >
            {savingEntry ? "Saving..." : "Record Entry"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Entry History */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Recent Entries</h3>
        {allEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No entries recorded yet.
          </p>
        ) : (
          <div className="space-y-1">
            {allEntries.slice(0, 30).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {entry.metricDefinition.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.value} {entry.metricDefinition.unit}
                    </Badge>
                    {entry.athlete && (
                      <Badge variant="secondary" className="text-xs">
                        {entry.athlete.name}
                      </Badge>
                    )}
                    {!entry.athlete && (
                      <Badge variant="secondary" className="text-xs">
                        Team
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {entry.event && (
                      <span className="text-xs text-muted-foreground">
                        · {entry.event.title}
                      </span>
                    )}
                    {entry.notes && (
                      <span className="text-xs text-muted-foreground truncate">
                        · {entry.notes}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={() => handleDeleteEntry(entry.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notes Tab ──────────────────────────────────────────────

function NotesTab({
  teamId,
  notes,
}: {
  teamId: string;
  notes: TeamNote[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("GENERAL");

  const handleCreate = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await createTeamNote(teamId, content.trim(), category as "GENERAL");
      setContent("");
      setCategory("GENERAL");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (note: TeamNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditCategory(note.category);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      await updateTeamNote(editingId, editContent.trim(), editCategory as "GENERAL");
      setEditingId(null);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTeamNote(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await togglePinTeamNote(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const filterOptions = [
    { value: "ALL", label: "All" },
    ...NOTE_CATEGORIES,
  ];

  const filteredNotes =
    filterCategory === "ALL"
      ? notes
      : notes.filter((n) => n.category === filterCategory);

  return (
    <div className="space-y-4">
      {/* Compose Area */}
      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Write a team note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCreate}
            disabled={!content.trim() || saving}
          >
            {saving ? "Saving..." : "Add Note"}
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterCategory(opt.value)}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              filterCategory === opt.value
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
            {opt.value !== "ALL" && (
              <span className="ml-1 opacity-60">
                ({notes.filter((n) => n.category === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <StickyNote className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {filterCategory === "ALL"
                ? "No notes yet"
                : `No ${filterCategory.toLowerCase()} notes`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border bg-card p-4 space-y-2 ${
                note.pinned ? "border-foreground/30" : ""
              }`}
            >
              {editingId === note.id ? (
                <>
                  <Textarea
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Select
                      value={editCategory}
                      onValueChange={setEditCategory}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTogglePin(note.id)}
                        className={`p-1.5 rounded hover:bg-muted transition-colors ${
                          note.pinned
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                        title={note.pinned ? "Unpin" : "Pin"}
                      >
                        <Pin className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        NOTE_CATEGORY_COLORS[note.category] ||
                        NOTE_CATEGORY_COLORS.GENERAL
                      }`}
                    >
                      {note.category}
                    </span>
                    {note.pinned && (
                      <Badge variant="outline" className="text-xs py-0">
                        Pinned
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {note.coach.name && `${note.coach.name} · `}
                      {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Announcements Tab ──────────────────────────────────────

function AnnouncementsTab({
  teamId,
  announcements,
}: {
  teamId: string;
  announcements: Announcement[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteAnnouncement(id);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {announcements.length} announcement
          {announcements.length !== 1 ? "s" : ""}
        </p>
        <ComposeAnnouncementDialog teamId={teamId}>
          <Button size="sm">
            <Plus className="size-4 mr-1.5" /> New Announcement
          </Button>
        </ComposeAnnouncementDialog>
      </div>

      {announcements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Megaphone className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No announcements yet
            </p>
            <ComposeAnnouncementDialog teamId={teamId}>
              <Button size="sm">
                <Plus className="size-4 mr-1.5" /> Send First Announcement
              </Button>
            </ComposeAnnouncementDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between rounded-lg border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.subject}</p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                  {a.body}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Sent{" "}
                  {new Date(a.sentAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                disabled={deleting === a.id}
                onClick={() => handleDelete(a.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Compose Announcement Dialog ────────────────────────────

function ComposeAnnouncementDialog({
  teamId,
  children,
}: {
  teamId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    body: "",
    notifyParents: true,
  });

  const handleSubmit = async () => {
    if (!form.subject || !form.body) return;
    setSaving(true);
    try {
      await createAnnouncement(teamId, form);
      setOpen(false);
      setForm({ subject: "", body: "", notifyParents: true });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Subject *</Label>
            <Input
              placeholder="Announcement subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea
              rows={5}
              placeholder="Type your message..."
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="notifyAnnounce"
              checked={form.notifyParents}
              onCheckedChange={(c) =>
                setForm((f) => ({ ...f, notifyParents: !!c }))
              }
            />
            <Label htmlFor="notifyAnnounce" className="cursor-pointer">
              Send email to athletes & parents
            </Label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!form.subject || !form.body || saving}
            className="w-full"
          >
            {saving ? "Sending..." : "Send Announcement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
