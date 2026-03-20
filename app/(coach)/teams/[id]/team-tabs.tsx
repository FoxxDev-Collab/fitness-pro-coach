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
import { addAthlete, updateAthlete, removeAthlete, assignProgramToTeam, deleteTeamAssignment } from "@/lib/actions/teams";
import { createEvent, deleteEvent } from "@/lib/actions/team-events";
import { createAnnouncement, deleteAnnouncement } from "@/lib/actions/team-announcements";

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

type Team = {
  id: string;
  name: string;
  athletes: Athlete[];
  teamAssignments: TeamAssignmentType[];
  events: TeamEvent[];
  announcements: Announcement[];
};

export function TeamTabs({ team }: { team: Team }) {
  return (
    <Tabs defaultValue="roster">
      <TabsList>
        <TabsTrigger value="roster" className="gap-1.5">
          <Users className="size-3.5" /> Roster
        </TabsTrigger>
        <TabsTrigger value="schedule" className="gap-1.5">
          <Calendar className="size-3.5" /> Schedule
        </TabsTrigger>
        <TabsTrigger value="programs" className="gap-1.5">
          <ClipboardList className="size-3.5" /> Programs
        </TabsTrigger>
        <TabsTrigger value="announcements" className="gap-1.5">
          <Megaphone className="size-3.5" /> Announcements
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roster">
        <RosterTab teamId={team.id} athletes={team.athletes} />
      </TabsContent>
      <TabsContent value="schedule">
        <ScheduleTab teamId={team.id} events={team.events} />
      </TabsContent>
      <TabsContent value="programs">
        <ProgramsTab teamId={team.id} teamName={team.name} teamAssignments={team.teamAssignments} />
      </TabsContent>
      <TabsContent value="announcements">
        <AnnouncementsTab teamId={team.id} announcements={team.announcements} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Roster Tab ────────────────────────────────────────────

function RosterTab({ teamId, athletes }: { teamId: string; athletes: Athlete[] }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

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
            <p className="text-sm text-muted-foreground mb-3">No athletes on this team</p>
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
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{a.name}</p>
                  {a.jerseyNumber && (
                    <Badge variant="outline">#{a.jerseyNumber}</Badge>
                  )}
                  {!a.active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {a.position && `${a.position} · `}
                  {a.email || "No email"}
                  {a.parentEmail && ` · Parent: ${a.parentEmail}`}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <AthleteFormDialog teamId={teamId} athlete={a}>
                  <Button variant="ghost" size="icon">
                    <Edit2 className="size-4" />
                  </Button>
                </AthleteFormDialog>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  disabled={removing === a.id}
                  onClick={() => handleRemove(a.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Athlete Form Dialog ───────────────────────────────────

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
        setForm({ name: "", email: "", phone: "", position: "", jerseyNumber: "", notes: "", parentName: "", parentEmail: "", parentPhone: "" });
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
            <Input placeholder="Athlete name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Position</Label>
              <Input placeholder="e.g. QB, Forward" value={form.position} onChange={(e) => set("position", e.target.value)} />
            </div>
            <div>
              <Label>Jersey #</Label>
              <Input placeholder="e.g. 12" value={form.jerseyNumber} onChange={(e) => set("jerseyNumber", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="athlete@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input placeholder="Phone number" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Parent / Guardian Contact</p>
            <div className="space-y-3">
              <div>
                <Label>Parent Name</Label>
                <Input placeholder="Parent/guardian name" value={form.parentName} onChange={(e) => set("parentName", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Parent Email</Label>
                  <Input type="email" placeholder="parent@email.com" value={form.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} />
                </div>
                <div>
                  <Label>Parent Phone</Label>
                  <Input placeholder="Phone number" value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Any notes about this athlete" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <Button onClick={handleSubmit} disabled={!form.name || saving} className="w-full">
            {saving ? "Saving..." : athlete ? "Save" : "Add Athlete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Schedule Tab ──────────────────────────────────────────

function ScheduleTab({ teamId, events }: { teamId: string; events: TeamEvent[] }) {
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
    <div key={e.id} className="flex items-start justify-between rounded-lg border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[e.type] || typeColors.OTHER}`}>
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
          <p className="text-sm text-muted-foreground mt-0.5">vs. {e.opponent}</p>
        )}
        {e.description && (
          <p className="text-sm text-muted-foreground mt-1">{e.description}</p>
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
            <p className="text-sm text-muted-foreground mb-3">No events scheduled</p>
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

// ─── Event Form Dialog ─────────────────────────────────────

const EVENT_TYPES = [
  { value: "PRACTICE", label: "Practice" },
  { value: "GAME", label: "Game" },
  { value: "MEETING", label: "Meeting" },
  { value: "TRYOUT", label: "Tryout" },
  { value: "CAMP", label: "Camp" },
  { value: "FUNDRAISER", label: "Fundraiser" },
  { value: "OTHER", label: "Other" },
] as const;

function EventFormDialog({ teamId, children }: { teamId: string; children: React.ReactNode }) {
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
      const endTime = form.endTime && !form.allDay
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
      setForm({ title: "", type: "PRACTICE", description: "", location: "", opponent: "", date: new Date().toISOString().split("T")[0], startTime: "09:00", endTime: "", allDay: false, notifyParents: true });
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
            <Input placeholder="e.g. Practice, Game vs. Eagles" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date *</Label>
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="allDay" checked={form.allDay} onCheckedChange={(c) => set("allDay", !!c)} />
            <Label htmlFor="allDay" className="cursor-pointer">All day event</Label>
          </div>
          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <Label>Location</Label>
            <Input placeholder="e.g. Main Field, Gym" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          {form.type === "GAME" && (
            <div>
              <Label>Opponent</Label>
              <Input placeholder="e.g. Eagles" value={form.opponent} onChange={(e) => set("opponent", e.target.value)} />
            </div>
          )}
          <div>
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Additional details..." value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="notify" checked={form.notifyParents} onCheckedChange={(c) => set("notifyParents", !!c)} />
            <Label htmlFor="notify" className="cursor-pointer">Notify athletes & parents via email</Label>
          </div>
          <Button onClick={handleSubmit} disabled={!form.title || saving} className="w-full">
            {saving ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Programs Tab ──────────────────────────────────────────

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
          {teamAssignments.length} program{teamAssignments.length !== 1 ? "s" : ""} assigned
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
            <p className="text-sm text-muted-foreground mb-3">No programs assigned</p>
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
                      <CardTitle className="text-base">{ta.program.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Assigned {new Date(ta.assignedAt).toLocaleDateString()}
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
                              {a.logs.length} session{a.logs.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Not started</Badge>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
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

// ─── Assign to Team Dialog ─────────────────────────────────

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
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
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
              <Button variant="outline" onClick={() => setSelectedProgram(null)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleAssign} disabled={saving} className="flex-1">
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

// ─── Announcements Tab ─────────────────────────────────────

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
          {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
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
            <p className="text-sm text-muted-foreground mb-3">No announcements yet</p>
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
            <div key={a.id} className="flex items-start justify-between rounded-lg border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.subject}</p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Sent {new Date(a.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
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

// ─── Compose Announcement Dialog ───────────────────────────

function ComposeAnnouncementDialog({ teamId, children }: { teamId: string; children: React.ReactNode }) {
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
            <Input placeholder="Announcement subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea rows={5} placeholder="Type your message..." value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="notifyAnnounce" checked={form.notifyParents} onCheckedChange={(c) => setForm((f) => ({ ...f, notifyParents: !!c }))} />
            <Label htmlFor="notifyAnnounce" className="cursor-pointer">Send email to athletes & parents</Label>
          </div>
          <Button onClick={handleSubmit} disabled={!form.subject || !form.body || saving} className="w-full">
            {saving ? "Sending..." : "Send Announcement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
