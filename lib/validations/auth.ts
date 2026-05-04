import { z } from "zod";

export { parseForm } from "./index";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Enter a valid email");

const name = z.string().trim().min(1, "Name is required").max(100, "Name is too long");

const password = z.string().min(1, "Password is required").max(200, "Password is too long");

const token = z
  .string()
  .min(16, "Invalid token")
  .max(256, "Invalid token")
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid token");

const mfaCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

export const signupSchema = z.object({
  name,
  email,
  password,
  confirmPassword: password,
});

export const loginSchema = z.object({
  email,
  password,
  mfaCode: mfaCode.optional().or(z.literal("").transform(() => undefined)),
});

export const requestPasswordResetSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token,
  password,
  confirmPassword: password,
});

export const acceptInviteSchema = z.object({
  token,
  password,
  confirmPassword: password,
});

export const updateProfileSchema = z.object({ name });

export const changePasswordSchema = z.object({
  currentPassword: password,
  password,
  confirmPassword: password,
});

export const enableMfaSchema = z.object({ code: mfaCode });

export const disableMfaSchema = z.object({ password });

