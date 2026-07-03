import type { RaceRow } from "@/app/(coach)/teams/[id]/results-tab";

export type PortalEventDTO = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  location: string | null;
  opponent: string | null;
  startTime: string; // ISO
  endTime: string | null;
  allDay: boolean;
};

export type PortalAnnouncementDTO = {
  id: string;
  subject: string;
  body: string;
  sentAt: string; // ISO
};

/**
 * Privacy-safe aggregate score for one squad/gender group at a meet. Contains
 * only team-level numbers — never another athlete's individual name or value.
 */
export type PortalScoreGroupDTO = {
  label: string;
  complete: boolean;
  score: number | null;
  finishers: number;
  opponentName: string | null;
  opponentScore: number | null;
  won: boolean | null;
  packTimeSeconds: number | null;
  averageSeconds: number | null;
};

export type PortalMeetScoreDTO = {
  eventId: string;
  title: string;
  date: string; // ISO
  groups: PortalScoreGroupDTO[];
};

export type PortalAthleteView = {
  athlete: { id: string; name: string };
  team: { id: string; name: string; sport: string | null; season: string | null };
  events: { upcoming: PortalEventDTO[]; past: PortalEventDTO[] };
  races: RaceRow[]; // this athlete's own results → <AthleteRaces>
  teamScores: PortalMeetScoreDTO[];
  announcements: PortalAnnouncementDTO[];
};

export type PortalDashboard = {
  email: string;
  athletes: PortalAthleteView[];
};
