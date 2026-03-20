"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";

export async function getTeams() {
  const coachId = await getCoachId();
  return db.team.findMany({
    where: { coachId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { athletes: true, events: true, teamAssignments: true },
      },
      events: {
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 1,
      },
    },
  });
}

export async function getTeam(id: string) {
  const coachId = await getCoachId();
  return db.team.findFirst({
    where: { id, coachId },
    include: {
      athletes: {
        orderBy: { name: "asc" },
        include: {
          assignments: {
            include: {
              program: true,
              logs: { orderBy: { date: "desc" }, take: 1 },
            },
          },
        },
      },
      teamAssignments: {
        include: {
          program: true,
          assignments: {
            include: {
              athlete: true,
              logs: { orderBy: { date: "desc" }, take: 1 },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      },
      events: {
        orderBy: { startTime: "asc" },
      },
      announcements: {
        orderBy: { sentAt: "desc" },
      },
    },
  });
}

export async function createTeam(data: {
  name: string;
  sport?: string;
  season?: string;
  description?: string;
}) {
  const coachId = await getCoachId();
  const team = await db.team.create({
    data: { ...data, coachId },
  });
  revalidatePath("/teams");
  return team;
}

export async function updateTeam(
  id: string,
  data: {
    name?: string;
    sport?: string;
    season?: string;
    description?: string;
    active?: boolean;
  }
) {
  const coachId = await getCoachId();
  const team = await db.team.update({
    where: { id, coachId },
    data,
  });
  revalidatePath("/teams");
  revalidatePath(`/teams/${id}`);
  return team;
}

export async function deleteTeam(id: string) {
  const coachId = await getCoachId();
  await db.team.delete({ where: { id, coachId } });
  revalidatePath("/teams");
}

// ─── Athletes ──────────────────────────────────────────────

export async function addAthlete(
  teamId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    jerseyNumber?: string;
    notes?: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
  }
) {
  const coachId = await getCoachId();
  const team = await db.team.findFirst({ where: { id: teamId, coachId } });
  if (!team) throw new Error("Team not found");

  const athlete = await db.athlete.create({
    data: { ...data, teamId },
  });
  revalidatePath(`/teams/${teamId}`);
  return athlete;
}

export async function updateAthlete(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    position?: string;
    jerseyNumber?: string;
    notes?: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    active?: boolean;
  }
) {
  const athlete = await db.athlete.findUnique({
    where: { id },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!athlete) throw new Error("Athlete not found");

  const coachId = await getCoachId();
  if (athlete.team.coachId !== coachId) throw new Error("Not authorized");

  const updated = await db.athlete.update({ where: { id }, data });
  revalidatePath(`/teams/${athlete.team.id}`);
  return updated;
}

export async function removeAthlete(id: string) {
  const athlete = await db.athlete.findUnique({
    where: { id },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!athlete) throw new Error("Athlete not found");

  const coachId = await getCoachId();
  if (athlete.team.coachId !== coachId) throw new Error("Not authorized");

  await db.athlete.delete({ where: { id } });
  revalidatePath(`/teams/${athlete.team.id}`);
}

// ─── Group Assignment ──────────────────────────────────────

export async function assignProgramToTeam(data: {
  teamId: string;
  programId: string;
  name: string;
  startDate?: Date;
}) {
  const coachId = await getCoachId();

  const team = await db.team.findFirst({
    where: { id: data.teamId, coachId },
    include: { athletes: { where: { active: true } } },
  });
  if (!team) throw new Error("Team not found");

  const program = await db.program.findFirst({
    where: { id: data.programId, coachId },
    include: {
      workouts: {
        include: {
          exercises: { include: { exercise: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!program) throw new Error("Program not found");

  // Create the team-level assignment record
  const teamAssignment = await db.teamAssignment.create({
    data: {
      teamId: data.teamId,
      programId: data.programId,
      name: data.name,
      startDate: data.startDate,
    },
  });

  // Create individual assignments for each athlete (snapshot copy)
  for (const athlete of team.athletes) {
    await db.assignment.create({
      data: {
        athleteId: athlete.id,
        programId: data.programId,
        teamAssignmentId: teamAssignment.id,
        name: `${data.name} - ${athlete.name}`,
        startDate: data.startDate,
        workouts: {
          create: program.workouts.map((w) => ({
            name: w.name,
            order: w.order,
            exercises: {
              create: w.exercises.map((we) => ({
                exerciseId: we.exerciseId,
                name: we.exercise.name,
                type: we.exercise.type,
                category: we.exercise.category,
                order: we.order,
                sets: we.sets,
                reps: we.reps,
                weight: we.weight,
                duration: we.duration,
                distance: we.distance,
                rest: we.rest,
                notes: we.notes,
              })),
            },
          })),
        },
      },
    });
  }

  revalidatePath(`/teams/${data.teamId}`);
  revalidatePath("/programs");
  return teamAssignment;
}

export async function deleteTeamAssignment(id: string) {
  const teamAssignment = await db.teamAssignment.findUnique({
    where: { id },
    include: { team: { select: { coachId: true, id: true } } },
  });
  if (!teamAssignment) return;

  const coachId = await getCoachId();
  if (teamAssignment.team.coachId !== coachId) return;

  // Delete all individual athlete assignments linked to this team assignment
  await db.assignment.deleteMany({ where: { teamAssignmentId: id } });
  await db.teamAssignment.delete({ where: { id } });
  revalidatePath(`/teams/${teamAssignment.team.id}`);
  revalidatePath("/programs");
}

// ─── Archive & Season Rollover ─────────────────────────────

export async function archiveTeam(id: string) {
  const coachId = await getCoachId();
  await db.team.update({
    where: { id, coachId },
    data: { archivedAt: new Date(), active: false },
  });
  revalidatePath("/teams");
  revalidatePath(`/teams/${id}`);
}

export async function rolloverTeam(
  id: string,
  data: {
    name: string;
    season?: string;
    sport?: string;
    keepAthletes: boolean;
  }
) {
  const coachId = await getCoachId();
  const oldTeam = await db.team.findFirst({
    where: { id, coachId },
    include: { athletes: { where: { active: true } } },
  });
  if (!oldTeam) throw new Error("Team not found");

  // Create new team
  const newTeam = await db.team.create({
    data: {
      name: data.name,
      season: data.season,
      sport: data.sport || oldTeam.sport,
      description: oldTeam.description,
      coachId,
    },
  });

  // Copy athletes if requested
  if (data.keepAthletes && oldTeam.athletes.length > 0) {
    await db.athlete.createMany({
      data: oldTeam.athletes.map((a) => ({
        name: a.name,
        email: a.email,
        phone: a.phone,
        gender: a.gender,
        position: a.position,
        jerseyNumber: a.jerseyNumber,
        parentName: a.parentName,
        parentEmail: a.parentEmail,
        parentPhone: a.parentPhone,
        teamId: newTeam.id,
      })),
    });
  }

  // Archive old team
  await db.team.update({
    where: { id },
    data: { archivedAt: new Date(), active: false },
  });

  revalidatePath("/teams");
  return newTeam;
}

// ─── Team Dashboard ────────────────────────────────────────

export async function getTeamDashboard(teamId: string) {
  const coachId = await getCoachId();
  const team = await db.team.findFirst({
    where: { id: teamId, coachId },
    include: {
      athletes: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          assignments: {
            select: {
              logs: {
                select: { date: true },
                orderBy: { date: "desc" },
              },
            },
          },
        },
      },
      teamAssignments: {
        select: {
          id: true,
          name: true,
          program: { select: { name: true } },
          assignments: {
            select: {
              athleteId: true,
              logs: { select: { id: true }, take: 1 },
            },
          },
        },
      },
      events: {
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 5,
      },
    },
  });

  if (!team) throw new Error("Team not found");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Compute athlete stats
  const athleteStats = team.athletes.map((a) => {
    const allLogs = a.assignments.flatMap((asgn) => asgn.logs);
    const lastSession = allLogs[0]?.date ?? null;
    return {
      id: a.id,
      name: a.name,
      totalSessions: allLogs.length,
      sessionsThisWeek: allLogs.filter((l) => new Date(l.date) >= weekAgo).length,
      lastSessionDate: lastSession,
    };
  }).sort((a, b) => b.totalSessions - a.totalSessions);

  const totalSessions = athleteStats.reduce((s, a) => s + a.totalSessions, 0);
  const sessionsThisWeek = athleteStats.reduce((s, a) => s + a.sessionsThisWeek, 0);
  const sessionsThisMonth = athleteStats.reduce((s, a) => {
    const logs = team.athletes.find((at) => at.id === a.id)!.assignments.flatMap((asgn) => asgn.logs);
    return s + logs.filter((l) => new Date(l.date) >= monthAgo).length;
  }, 0);

  // Weekly activity (last 8 weeks)
  const weeklyActivity: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const count = athleteStats.reduce((s, a) => {
      const logs = team.athletes.find((at) => at.id === a.id)!.assignments.flatMap((asgn) => asgn.logs);
      return s + logs.filter((l) => {
        const d = new Date(l.date);
        return d >= start && d < end;
      }).length;
    }, 0);
    weeklyActivity.push({
      week: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    });
  }

  // Program completion
  const programCompletion = team.teamAssignments.map((ta) => ({
    id: ta.id,
    name: ta.program.name,
    total: ta.assignments.length,
    started: ta.assignments.filter((a) => a.logs.length > 0).length,
  }));

  return {
    athleteCount: team.athletes.length,
    totalSessions,
    sessionsThisWeek,
    sessionsThisMonth,
    athleteStats,
    weeklyActivity,
    programCompletion,
    upcomingEvents: team.events,
  };
}
