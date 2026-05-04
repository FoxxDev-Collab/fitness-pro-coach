"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getCoachId } from "@/lib/auth-utils";
import { parseInput } from "@/lib/validations";
import {
  updateCoachProfileSchema,
  SLUG_PATTERN,
  type UpdateCoachProfileInput,
} from "@/lib/validations/coach-profile";

export type CoachProfile = {
  name: string | null;
  email: string;
  businessName: string | null;
  specialty: string | null;
  bio: string | null;
  intakeSlug: string | null;
  timezone: string | null;
  onboardedAt: Date | null;
  setupChecklistDismissedAt: Date | null;
};

export async function getCoachProfile(): Promise<CoachProfile> {
  const coachId = await getCoachId();
  const user = await db.user.findUnique({
    where: { id: coachId },
    select: {
      name: true,
      email: true,
      businessName: true,
      specialty: true,
      bio: true,
      intakeSlug: true,
      timezone: true,
      onboardedAt: true,
      setupChecklistDismissedAt: true,
    },
  });
  if (!user) throw new Error("Coach not found");
  return user;
}

export type { UpdateCoachProfileInput };

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function generateUniqueSlug(seed: string, excludeUserId?: string): Promise<string> {
  const base = normalizeSlug(seed) || "coach";
  let candidate = base.slice(0, 40);
  let suffix = 2;
  while (true) {
    const existing = await db.user.findUnique({
      where: { intakeSlug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeUserId) return candidate;
    const tail = `-${suffix}`;
    candidate = `${base.slice(0, 40 - tail.length)}${tail}`;
    suffix++;
    if (suffix > 999) throw new Error("Could not generate unique slug");
  }
}

export async function checkSlugAvailable(slug: string): Promise<{ available: boolean; reason?: string }> {
  const coachId = await getCoachId();
  if (typeof slug !== "string") return { available: false, reason: "Invalid slug" };
  const normalized = normalizeSlug(slug);
  if (!SLUG_PATTERN.test(normalized)) {
    return { available: false, reason: "Use 3-40 letters, numbers, or hyphens" };
  }
  const existing = await db.user.findUnique({
    where: { intakeSlug: normalized },
    select: { id: true },
  });
  if (existing && existing.id !== coachId) {
    return { available: false, reason: "Already taken — try another" };
  }
  return { available: true };
}

export async function updateCoachProfile(input: UpdateCoachProfileInput) {
  const parsed = parseInput(updateCoachProfileSchema, input);
  if (!parsed.ok) return { error: parsed.error };

  const coachId = await getCoachId();

  // For intakeSlug, additionally check uniqueness in DB
  if (parsed.data.intakeSlug) {
    const existing = await db.user.findUnique({
      where: { intakeSlug: parsed.data.intakeSlug },
      select: { id: true },
    });
    if (existing && existing.id !== coachId) {
      return { error: "That intake URL is already taken" };
    }
  }

  await db.user.update({ where: { id: coachId }, data: parsed.data });

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}

export async function completeOnboarding(input: UpdateCoachProfileInput) {
  const result = await updateCoachProfile(input);
  if ("error" in result) return result;
  const coachId = await getCoachId();
  await db.user.update({
    where: { id: coachId },
    data: { onboardedAt: new Date() },
  });
  revalidatePath("/");
  return { success: true };
}

export async function dismissSetupChecklist() {
  const coachId = await getCoachId();
  await db.user.update({
    where: { id: coachId },
    data: { setupChecklistDismissedAt: new Date() },
  });
  revalidatePath("/");
}

export async function getSetupProgress() {
  const coachId = await getCoachId();
  const [user, clientCount, programCount, assignmentCount] = await Promise.all([
    db.user.findUnique({
      where: { id: coachId },
      select: {
        businessName: true,
        specialty: true,
        timezone: true,
        intakeSlug: true,
        onboardedAt: true,
        setupChecklistDismissedAt: true,
      },
    }),
    db.client.count({ where: { coachId } }),
    db.program.count({ where: { coachId } }),
    db.assignment.count({ where: { client: { coachId } } }),
  ]);

  if (!user) throw new Error("Coach not found");

  const profileComplete = !!(user.businessName && user.specialty && user.timezone);

  return {
    profileComplete,
    hasClient: clientCount > 0,
    hasProgram: programCount > 0,
    hasAssignment: assignmentCount > 0,
    hasIntakeSlug: !!user.intakeSlug,
    intakeSlug: user.intakeSlug,
    onboardedAt: user.onboardedAt,
    checklistDismissed: !!user.setupChecklistDismissedAt,
  };
}
