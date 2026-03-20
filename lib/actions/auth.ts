"use server";

import { db } from "@/lib/db";
import { signIn, auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { validatePassword, isCommonPassword } from "@/lib/password";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import * as OTPAuth from "otpauth";
import { revalidatePath } from "next/cache";

function serverValidatePassword(password: string, confirmPassword: string) {
  if (!password) return "Password is required";
  const { valid, errors } = validatePassword(password);
  if (!valid) return errors[0];
  if (password !== confirmPassword) return "Passwords do not match";
  if (isCommonPassword(password)) return "This password is too common";
  return null;
}

// ─── Signup ───────────────────────────────────────────────

export async function signUp(formData: FormData) {
  const name = formData.get("name") as string;
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !email) return { error: "Name and email are required" };

  const pwError = serverValidatePassword(password, confirmPassword);
  if (pwError) return { error: pwError };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists" };

  const hashed = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { name, email, password: hashed, role: "COACH" },
  });

  // Send verification email
  const verifyToken = await db.emailVerificationToken.create({
    data: {
      email,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  try {
    await sendVerificationEmail(email, verifyToken.token);
  } catch (e) {
    console.error("Failed to send verification email:", e);
    return { error: "Account created but we couldn't send the verification email. Please try again or contact support." };
  }

  return { success: true, email };
}

// ─── Login ───────────────────────────────────────────────

export async function login(formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;
  const mfaCode = formData.get("mfaCode") as string | null;

  if (!email || !password) return { error: "Email and password are required" };

  // Check user exists and password is valid before signIn
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.password) return { error: "Invalid email or password" };
  if (!user.active) return { error: "Account is disabled" };
  if (!user.emailVerified) return { error: "EMAIL_NOT_VERIFIED" };

  const validPw = await bcrypt.compare(password, user.password);
  if (!validPw) return { error: "Invalid email or password" };

  // MFA check
  if (user.mfaEnabled && user.mfaSecret) {
    if (!mfaCode) return { error: "MFA_REQUIRED" };

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const valid = totp.validate({ token: mfaCode, window: 1 });
    if (valid === null) return { error: "Invalid verification code" };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    return { error: "Invalid email or password" };
  }

  if (user.role === "ADMIN") redirect("/admin/dashboard");
  if (user.role === "CLIENT") redirect("/dashboard");
  redirect("/clients");
}

// ─── Email Verification ──────────────────────────────────

export async function verifyEmail(token: string) {
  const record = await db.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.used || record.expires < new Date()) {
    return { error: "This verification link is invalid or expired" };
  }

  await db.user.update({
    where: { email: record.email },
    data: { emailVerified: new Date() },
  });

  await db.emailVerificationToken.update({
    where: { id: record.id },
    data: { used: true },
  });

  return { success: true };
}

export async function resendVerification() {
  const session = await auth();
  if (!session?.user?.email) return { error: "Not authenticated" };

  const user = await db.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { error: "User not found" };
  if (user.emailVerified) return { error: "Email already verified" };

  // Expire old tokens
  await db.emailVerificationToken.updateMany({
    where: { email: user.email, used: false },
    data: { used: true },
  });

  const token = await db.emailVerificationToken.create({
    data: {
      email: user.email,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail(user.email, token.token);
  return { success: true };
}

// ─── Password Reset ──────────────────────────────────────

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  if (!email) return { error: "Email is required" };

  // Always return success to prevent email enumeration
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    // Expire old tokens
    await db.passwordResetToken.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    const token = await db.passwordResetToken.create({
      data: {
        email,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    try {
      await sendPasswordResetEmail(email, token.token);
    } catch (e) {
      console.error("Failed to send reset email:", e);
    }
  }

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const pwError = serverValidatePassword(password, confirmPassword);
  if (pwError) return { error: pwError };

  const record = await db.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.used || record.expires < new Date()) {
    return { error: "This reset link is invalid or expired" };
  }

  const hashed = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { email: record.email },
    data: { password: hashed },
  });

  await db.passwordResetToken.update({
    where: { id: record.id },
    data: { used: true },
  });

  redirect("/login");
}

// ─── MFA ─────────────────────────────────────────────────

export async function setupMfa() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const secret = new OTPAuth.Secret();

  const totp = new OTPAuth.TOTP({
    issuer: "Praevio",
    label: session.user.email || "user",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  // Store secret temporarily (not enabled yet until verified)
  await db.user.update({
    where: { id: session.user.id },
    data: { mfaSecret: secret.base32 },
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

export async function enableMfa(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  const code = formData.get("code") as string;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.mfaSecret) return { error: "MFA not set up" };

  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const valid = totp.validate({ token: code, window: 1 });
  if (valid === null) return { error: "Invalid code. Try again." };

  await db.user.update({
    where: { id: session.user.id },
    data: { mfaEnabled: true },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function disableMfa(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  const password = formData.get("password") as string;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) return { error: "Cannot verify identity" };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { error: "Incorrect password" };

  await db.user.update({
    where: { id: session.user.id },
    data: { mfaEnabled: false, mfaSecret: null },
  });

  revalidatePath("/settings");
  return { success: true };
}

// ─── Profile Update ──────────────────────────────────────

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  await db.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const currentPassword = formData.get("currentPassword") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.password) return { error: "Cannot verify identity" };

  const validCurrent = await bcrypt.compare(currentPassword, user.password);
  if (!validCurrent) return { error: "Current password is incorrect" };

  const pwError = serverValidatePassword(password, confirmPassword);
  if (pwError) return { error: pwError };

  if (await bcrypt.compare(password, user.password)) {
    return { error: "New password must be different from current password" };
  }

  const hashed = await bcrypt.hash(password, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });

  return { success: true };
}

// ─── Accept Invite ───────────────────────────────────────

export async function acceptInvite(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const pwError = serverValidatePassword(password, confirmPassword);
  if (pwError) return { error: pwError };

  const invite = await db.inviteToken.findUnique({ where: { token } });
  if (!invite || invite.used || invite.expires < new Date()) {
    return { error: "This invite link is invalid or expired" };
  }

  const client = await db.client.findUnique({ where: { id: invite.clientId } });
  if (!client) return { error: "Client not found" };

  let user = await db.user.findUnique({ where: { email: invite.email } });
  const hashed = await bcrypt.hash(password, 12);

  if (user) {
    await db.client.update({
      where: { id: client.id },
      data: { userId: user.id },
    });
  } else {
    user = await db.user.create({
      data: {
        name: client.name,
        email: invite.email,
        password: hashed,
        role: "CLIENT",
        emailVerified: new Date(), // Verified via invite link
      },
    });
    await db.client.update({
      where: { id: client.id },
      data: { userId: user.id },
    });
  }

  await db.inviteToken.update({
    where: { id: invite.id },
    data: { used: true },
  });

  try {
    await signIn("credentials", { email: invite.email, password, redirect: false });
  } catch {
    redirect("/login");
  }

  redirect("/dashboard");
}
