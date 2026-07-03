import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Megaphone, Timer, Trophy } from "lucide-react";
import { formatTime } from "@/lib/results/format";
import type {
  PortalEventDTO,
  PortalMeetScoreDTO,
  PortalAnnouncementDTO,
} from "@/lib/portal/dashboard-types";

const EVENT_LABEL: Record<string, string> = {
  PRACTICE: "Practice",
  GAME: "Game",
  MEET: "Meet",
  MEETING: "Meeting",
  TRYOUT: "Tryout",
  CAMP: "Camp",
  FUNDRAISER: "Fundraiser",
  OTHER: "Event",
};

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function EventRow({ event }: { event: PortalEventDTO }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-card p-3">
      <div className="flex flex-col items-center justify-center rounded-md bg-muted px-2.5 py-1 text-center shrink-0">
        <span className="text-[10px] font-medium uppercase text-muted-foreground">
          {new Date(event.startTime).toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-lg font-bold leading-none">
          {new Date(event.startTime).getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{event.title}</span>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {EVENT_LABEL[event.type] ?? "Event"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {fmtDay(event.startTime)}
          {!event.allDay && ` · ${fmtTimeOfDay(event.startTime)}`}
        </p>
        {event.location && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" /> {event.location}
          </p>
        )}
        {event.opponent && (
          <p className="text-xs text-muted-foreground">vs {event.opponent}</p>
        )}
        {event.description && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function PortalSchedule({
  events,
}: {
  events: { upcoming: PortalEventDTO[]; past: PortalEventDTO[] };
}) {
  const { upcoming, past } = events;
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <CalendarDays className="mx-auto mb-2 size-6 opacity-50" />
          No events scheduled yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Recent</h3>
          <div className="space-y-2 opacity-80">
            {past.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function PortalTeamScores({ meets }: { meets: PortalMeetScoreDTO[] }) {
  if (meets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <Trophy className="mx-auto mb-2 size-6 opacity-50" />
          No meet scores yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {meets.map((meet) => (
        <Card key={meet.eventId}>
          <CardContent className="space-y-3 pt-4 pb-3">
            <div>
              <p className="font-medium">{meet.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(meet.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            {meet.groups.map((g) => (
              <div key={g.label} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{g.label}</span>
                  {g.complete && g.score != null ? (
                    <span className="text-sm">
                      Score <span className="font-bold">{g.score}</span>
                      {g.opponentName && (
                        <>
                          {" "}
                          vs {g.opponentName} {g.opponentScore}{" "}
                          {g.won != null && (
                            <Badge
                              variant={g.won ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {g.won ? "W" : "L"}
                            </Badge>
                          )}
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Incomplete team ({g.finishers}/5)
                    </span>
                  )}
                </div>
                {g.complete && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {g.packTimeSeconds != null && (
                      <span className="flex items-center gap-1">
                        <Timer className="size-3" /> Pack {formatTime(g.packTimeSeconds)}
                      </span>
                    )}
                    {g.averageSeconds != null && (
                      <span>Avg {formatTime(g.averageSeconds)}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PortalAnnouncements({
  items,
}: {
  items: PortalAnnouncementDTO[];
}) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <Megaphone className="mx-auto mb-2 size-6 opacity-50" />
          No announcements yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <Card key={a.id}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{a.subject}</p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(a.sentAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {a.body}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
