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
