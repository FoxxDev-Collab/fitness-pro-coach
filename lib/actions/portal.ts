"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { getCoachId, getPortalEmail } from "@/lib/auth-utils";
import {
  sendPortalMagicLinkEmail,
  sendPortalJoinLinkEmail,
} from "@/lib/email";
import { rateLimitByIp, tooManyRequestsMessage } from "@/lib/rate-limit";
import { generateJoinCode, normalizeJoinCode } from "@/lib/portal/code";
import {
  generatePortalToken,
  portalTokenExpiry,
} from "@/lib/portal/token";
import {
  normalizeEmail,
  emailMatchesRoster,
  type LinkableAthlete,
} from "@/lib/portal/linking";
import { computeTeamScore } from "@/lib/results/scoring";
import type { EngineResult, UnitType, Direction } from "@/lib/results/types";
import type { RaceRow } from "@/app/(coach)/teams/[id]/results-tab";
import type {
  PortalDashboard,
  PortalMeetScoreDTO,
  PortalScoreGroupDTO,
} from "@/lib/portal/dashboard-types";

const cuidRegex = /^[a-z0-9]{20,40}$/;

function baseUrl() {
  return process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";
}

/**
 * Generic result for the link-request flows. The SAME shape is returned whether
 * or not a match was found, so an attacker can't enumerate rosters. Only a
 * rate-limit rejection differs (that leaks nothing about who's on a team).
 */
const GENERIC_OK = { ok: true as const };
type PortalLinkResult = { ok: true } | { ok: false; error: string };

/** Mint a single-use magic link for `email` and send it. Expires prior unused. */
async function issueMagicLink(
  email: string,
  teamId: string | null,
  teamName: string | null,
): Promise<void> {
  await db.portalMagicToken.updateMany({
    where: { email, used: false },
    data: { used: true },
  });
  const token = generatePortalToken();
  await db.portalMagicToken.create({
    data: { email, teamId, token, expires: portalTokenExpiry() },
  });
  const url = `${baseUrl()}/portal/verify/${token}`;
  await sendPortalMagicLinkEmail(email, url, teamName);
}

/**
 * First-time join: team join code + email. If the email matches an athlete on
 * that team (as the athlete or their parent), send a magic link; otherwise log
 * a PortalJoinRequest for the coach. Always returns the generic result.
 */
export async function requestPortalLink(
  rawCode: string,
  rawEmail: string,
): Promise<PortalLinkResult> {
  const code = normalizeJoinCode(String(rawCode ?? ""));
  const email = normalizeEmail(String(rawEmail ?? ""));
  if (!code || !email) return GENERIC_OK;

  const rl = await rateLimitByIp("portal-link", 5, "15 m", email);
  if (!rl.ok) return { ok: false, error: tooManyRequestsMessage(rl.retryAfterSeconds) };

  const team = await db.team.findUnique({
    where: { joinCode: code },
    select: { id: true, name: true },
  });
  if (!team) return GENERIC_OK; // unknown code — generic, nothing to log

  const athletes: LinkableAthlete[] = await db.athlete.findMany({
    where: { teamId: team.id },
    select: { id: true, email: true, parentEmail: true, active: true },
  });

  if (emailMatchesRoster(athletes, email)) {
    await issueMagicLink(email, team.id, team.name);
  } else {
    await db.portalJoinRequest.create({ data: { teamId: team.id, email } });
  }
  return GENERIC_OK;
}

/**
 * Returning login: email only. Sends a magic link if a PORTAL user already
 * exists with that email, or if any active athlete links to it. Generic result.
 */
export async function requestPortalLoginLink(
  rawEmail: string,
): Promise<PortalLinkResult> {
  const email = normalizeEmail(String(rawEmail ?? ""));
  if (!email) return GENERIC_OK;

  const rl = await rateLimitByIp("portal-login", 5, "15 m", email);
  if (!rl.ok) return { ok: false, error: tooManyRequestsMessage(rl.retryAfterSeconds) };

  const [user, athleteMatch] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { role: true } }),
    db.athlete.findFirst({
      where: {
        active: true,
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { parentEmail: { equals: email, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    }),
  ]);

  const isPortalUser = user?.role === "PORTAL";
  if (isPortalUser || athleteMatch) {
    await issueMagicLink(email, null, null);
  }
  return GENERIC_OK;
}

/**
 * Consume a magic-link token and establish the portal session. Called from the
 * verify page. On success redirects to the dashboard; on any failure (expired,
 * used, or the email belongs to a non-portal account) returns a friendly error.
 */
export async function verifyPortalLogin(
  token: string,
): Promise<{ error: string } | void> {
  if (typeof token !== "string" || token.length === 0) {
    return { error: "This sign-in link is invalid. Request a new one." };
  }
  try {
    await signIn("portal-magic-link", { token, redirect: false });
  } catch {
    return {
      error:
        "This sign-in link has expired or already been used. Request a new one.",
    };
  }
  redirect("/portal");
}

/** Ends the portal session and returns to the portal login. */
export async function portalSignOut(): Promise<void> {
  await signOut({ redirectTo: "/portal/login" });
}

// ─── Portal dashboard (read-only, scoped to the viewer's email) ────────────

function genderLabel(gender: string | null): string {
  if (!gender) return "";
  const g = gender.trim().toLowerCase();
  if (g.startsWith("m")) return "Boys";
  if (g.startsWith("f") || g.startsWith("w") || g.startsWith("g")) return "Girls";
  return gender;
}

function groupLabel(squad: string | null, gender: string | null): string {
  return [squad ?? "Squad", genderLabel(gender)].filter(Boolean).join(" ");
}

function rowToEngine(r: RaceRow): EngineResult {
  return {
    id: r.id,
    athleteId: r.athleteId,
    disciplineId: r.disciplineId,
    eventId: r.eventId,
    value: r.value,
    place: r.place,
    squad: r.squad,
    gender: r.athlete.gender,
    dnf: r.dnf,
    date: new Date(r.event.startTime),
  };
}

/**
 * Aggregate, privacy-safe meet scores for a team. Computed entirely server-side
 * from the full roster's results, but only team-level numbers are returned —
 * never another athlete's individual name or time.
 */
function summarizeMeetScores(
  rows: RaceRow[],
  opponentScores: { eventId: string; groupLabel: string; opponentName: string; score: number }[],
): PortalMeetScoreDTO[] {
  const byEvent = new Map<string, RaceRow[]>();
  for (const r of rows) {
    const arr = byEvent.get(r.eventId);
    if (arr) arr.push(r);
    else byEvent.set(r.eventId, [r]);
  }

  const meets: PortalMeetScoreDTO[] = [];
  for (const [eventId, evRows] of byEvent) {
    const ev = evRows[0]!.event;
    const groups = new Map<string, RaceRow[]>();
    for (const r of evRows) {
      const label = groupLabel(r.squad, r.athlete.gender);
      const arr = groups.get(label);
      if (arr) arr.push(r);
      else groups.set(label, [r]);
    }

    const groupDTOs: PortalScoreGroupDTO[] = [];
    for (const [label, gRows] of groups) {
      const score = computeTeamScore(gRows.map(rowToEngine));
      const opp = opponentScores.find(
        (o) => o.eventId === eventId && o.groupLabel === label,
      );
      const won =
        score.complete && score.score != null && opp
          ? score.score < opp.score
          : null;
      groupDTOs.push({
        label,
        complete: score.complete,
        score: score.score,
        finishers: score.finishers,
        opponentName: opp?.opponentName ?? null,
        opponentScore: opp?.score ?? null,
        won,
        packTimeSeconds: score.packTimeSeconds,
        averageSeconds: score.averageSeconds,
      });
    }

    meets.push({
      eventId,
      title: ev.title,
      date: new Date(ev.startTime).toISOString(),
      groups: groupDTOs,
    });
  }

  meets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return meets;
}

/**
 * The read-only portal dashboard for the signed-in viewer, scoped to their
 * email. Returns one view per linked athlete (a parent's kids, or the athlete
 * themselves). Only the viewer's own athlete's individual results leave the
 * server; everything team-level is aggregate.
 */
export async function getPortalDashboard(): Promise<PortalDashboard> {
  const email = await getPortalEmail();
  if (!email) return { email: "", athletes: [] };

  const linked = await db.athlete.findMany({
    where: {
      active: true,
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { parentEmail: { equals: email, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      teamId: true,
      team: { select: { id: true, name: true, sport: true, season: true } },
    },
  });

  // The viewer may log workouts only for an athlete that IS them (own email
  // matches the login). Fetch assignments just for those self-athletes.
  const normalizedLogin = normalizeEmail(email);
  const selfAthleteIds = linked
    .filter((a) => normalizeEmail(a.email) === normalizedLogin)
    .map((a) => a.id);

  const assignmentsByAthlete = new Map<string, PortalDashboard["athletes"][number]["assignments"]>();
  await Promise.all(
    selfAthleteIds.map(async (athleteId) => {
      const rows = await db.assignment.findMany({
        where: { athleteId },
        orderBy: { assignedAt: "desc" },
        select: {
          id: true,
          name: true,
          workouts: {
            orderBy: { order: "asc" },
            select: { id: true, name: true, _count: { select: { exercises: true } } },
          },
          logs: { select: { workoutIndex: true, date: true } },
        },
      });
      assignmentsByAthlete.set(
        athleteId,
        rows.map((a) => ({
          id: a.id,
          name: a.name,
          sessionsLogged: a.logs.length,
          workouts: a.workouts.map((w, index) => {
            const logs = a.logs.filter((l) => l.workoutIndex === index);
            const last = logs.reduce<Date | null>(
              (acc, l) => (!acc || l.date > acc ? l.date : acc),
              null,
            );
            return {
              index,
              name: w.name,
              exerciseCount: w._count.exercises,
              lastLoggedAt: last ? last.toISOString() : null,
            };
          }),
        })),
      );
    }),
  );

  const teamIds = [...new Set(linked.map((a) => a.teamId))];

  const teamData = new Map<
    string,
    {
      upcoming: PortalDashboard["athletes"][number]["events"]["upcoming"];
      past: PortalDashboard["athletes"][number]["events"]["past"];
      announcements: PortalDashboard["athletes"][number]["announcements"];
      rows: RaceRow[];
      teamScores: PortalMeetScoreDTO[];
    }
  >();

  await Promise.all(
    teamIds.map(async (teamId) => {
      const [events, announcements, entryRows, opponentScores] = await Promise.all([
        db.teamEvent.findMany({
          where: { teamId },
          orderBy: { startTime: "asc" },
          select: {
            id: true,
            title: true,
            type: true,
            description: true,
            location: true,
            opponent: true,
            startTime: true,
            endTime: true,
            allDay: true,
          },
        }),
        db.teamAnnouncement.findMany({
          where: { teamId },
          orderBy: { sentAt: "desc" },
          take: 15,
          select: { id: true, subject: true, body: true, sentAt: true },
        }),
        db.metricEntry.findMany({
          where: {
            eventId: { not: null },
            athlete: { teamId },
            metricDefinition: { direction: { not: null } },
          },
          include: {
            event: { select: { id: true, title: true, startTime: true, type: true } },
            athlete: { select: { id: true, name: true, gender: true } },
            metricDefinition: {
              select: { id: true, name: true, unitType: true, direction: true },
            },
            splits: { orderBy: { order: "asc" } },
          },
        }),
        db.meetOpponentScore.findMany({ where: { event: { teamId } } }),
      ]);

      const rows: RaceRow[] = entryRows
        .filter((r) => r.athlete && r.event && r.eventId)
        .map((r) => ({
          id: r.id,
          athleteId: r.athleteId as string,
          disciplineId: r.metricDefinitionId,
          eventId: r.eventId as string,
          value: r.value,
          place: r.place,
          squad: r.squad,
          dnf: r.status !== "FINISHED",
          event: r.event!,
          athlete: r.athlete!,
          discipline: {
            id: r.metricDefinition.id,
            name: r.metricDefinition.name,
            unitType: r.metricDefinition.unitType as UnitType,
            direction: (r.metricDefinition.direction ?? "LOWER_BETTER") as Direction,
          },
          splits: r.splits.map((s) => ({ order: s.order, label: s.label, value: s.value })),
        }));

      const nowMs = Date.now();
      const toEventDTO = (e: (typeof events)[number]) => ({
        id: e.id,
        title: e.title,
        type: e.type as string,
        description: e.description,
        location: e.location,
        opponent: e.opponent,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime ? e.endTime.toISOString() : null,
        allDay: e.allDay,
      });

      const upcoming = events
        .filter((e) => e.startTime.getTime() >= nowMs)
        .map(toEventDTO);
      const past = events
        .filter((e) => e.startTime.getTime() < nowMs)
        .reverse()
        .slice(0, 10)
        .map(toEventDTO);

      teamData.set(teamId, {
        upcoming,
        past,
        announcements: announcements.map((a) => ({
          id: a.id,
          subject: a.subject,
          body: a.body,
          sentAt: a.sentAt.toISOString(),
        })),
        rows,
        teamScores: summarizeMeetScores(rows, opponentScores),
      });
    }),
  );

  const athletes = linked.map((a) => {
    const td = teamData.get(a.teamId)!;
    const isSelf = normalizeEmail(a.email) === normalizedLogin;
    return {
      athlete: { id: a.id, name: a.name },
      team: a.team,
      events: { upcoming: td.upcoming, past: td.past },
      races: td.rows.filter((r) => r.athleteId === a.id),
      teamScores: td.teamScores,
      announcements: td.announcements,
      isSelf,
      assignments: isSelf ? (assignmentsByAthlete.get(a.id) ?? []) : [],
    };
  });

  return { email, athletes };
}

// ─── Coach-side management (ownership-scoped) ──────────────────────────────

/** Always assigns a fresh unique join code to a coach-owned team. */
async function mintJoinCode(teamId: string): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateJoinCode();
    try {
      await db.team.update({ where: { id: teamId }, data: { joinCode: code } });
      return code;
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") continue; // collision, retry
      throw err;
    }
  }
  throw new Error("Could not generate a unique join code");
}

async function requireOwnedTeam(teamId: string) {
  if (typeof teamId !== "string" || !cuidRegex.test(teamId)) {
    throw new Error("Invalid team id");
  }
  const coachId = await getCoachId();
  const team = await db.team.findFirst({
    where: { id: teamId, coachId },
    select: { id: true, name: true, joinCode: true },
  });
  if (!team) throw new Error("Team not found");
  return team;
}

/** Distinct, non-empty portal recipient emails for a team (parents + athletes). */
async function teamRecipientEmails(teamId: string): Promise<string[]> {
  const athletes = await db.athlete.findMany({
    where: { teamId, active: true },
    select: { email: true, parentEmail: true },
  });
  const set = new Set<string>();
  for (const a of athletes) {
    const own = normalizeEmail(a.email);
    const parent = normalizeEmail(a.parentEmail);
    if (own) set.add(own);
    if (parent) set.add(parent);
  }
  return [...set];
}

export async function getTeamJoinInfo(teamId: string) {
  const team = await requireOwnedTeam(teamId);
  const joinCode = team.joinCode ?? (await mintJoinCode(team.id));
  const [recipients, pendingRequests] = await Promise.all([
    teamRecipientEmails(team.id),
    db.portalJoinRequest.count({ where: { teamId: team.id, resolvedAt: null } }),
  ]);
  return {
    joinCode,
    joinUrl: `${baseUrl()}/join/${joinCode}`,
    recipientCount: recipients.length,
    pendingRequests,
  };
}

export async function regenerateJoinCode(teamId: string) {
  const team = await requireOwnedTeam(teamId);
  const joinCode = await mintJoinCode(team.id);
  revalidatePath(`/teams/${team.id}`);
  return { joinCode, joinUrl: `${baseUrl()}/join/${joinCode}` };
}

export async function emailAllPortal(teamId: string) {
  const team = await requireOwnedTeam(teamId);

  const coachId = await getCoachId();
  const rl = await rateLimitByIp("portal-email-all", 5, "1 h", `${coachId}:${team.id}`);
  if (!rl.ok) throw new Error(tooManyRequestsMessage(rl.retryAfterSeconds));

  const joinCode = team.joinCode ?? (await mintJoinCode(team.id));
  const joinUrl = `${baseUrl()}/join/${joinCode}`;
  const recipients = await teamRecipientEmails(team.id);

  const results = await Promise.allSettled(
    recipients.map((to) => sendPortalJoinLinkEmail(to, joinUrl, team.name)),
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;
  return { sent, failed, total: recipients.length };
}

export async function getPortalJoinRequests(teamId: string) {
  const team = await requireOwnedTeam(teamId);
  return db.portalJoinRequest.findMany({
    where: { teamId: team.id, resolvedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, createdAt: true },
  });
}

export async function resolveJoinRequest(requestId: string) {
  if (typeof requestId !== "string" || !cuidRegex.test(requestId)) {
    throw new Error("Invalid request id");
  }
  const coachId = await getCoachId();
  // Scope by ownership through the team relation.
  const request = await db.portalJoinRequest.findFirst({
    where: { id: requestId, team: { coachId } },
    select: { id: true, teamId: true },
  });
  if (!request) throw new Error("Request not found");
  await db.portalJoinRequest.update({
    where: { id: request.id },
    data: { resolvedAt: new Date() },
  });
  revalidatePath(`/teams/${request.teamId}`);
  return { success: true };
}
