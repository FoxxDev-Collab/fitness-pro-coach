"use server";

import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashed = await bcrypt.hash(password, 12);

  await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: "COACH",
    },
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/clients",
  });
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch {
    return { error: "Invalid email or password" };
  }

  // Fetch role for redirect
  const user = await db.user.findUnique({ where: { email } });
  if (user?.role === "ADMIN") redirect("/admin/dashboard");
  if (user?.role === "CLIENT") redirect("/dashboard");
  redirect("/clients");
}

export async function acceptInvite(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const invite = await db.inviteToken.findUnique({ where: { token } });
  if (!invite || invite.used || invite.expires < new Date()) {
    return { error: "This invite link is invalid or expired" };
  }

  const client = await db.client.findUnique({ where: { id: invite.clientId } });
  if (!client) {
    return { error: "Client not found" };
  }

  // Check if user already exists with this email
  let user = await db.user.findUnique({ where: { email: invite.email } });

  const hashed = await bcrypt.hash(password, 12);

  if (user) {
    // Link existing user to client
    await db.client.update({
      where: { id: client.id },
      data: { userId: user.id },
    });
  } else {
    // Create new user
    user = await db.user.create({
      data: {
        name: client.name,
        email: invite.email,
        password: hashed,
        role: "CLIENT",
      },
    });

    await db.client.update({
      where: { id: client.id },
      data: { userId: user.id },
    });
  }

  // Mark invite as used
  await db.inviteToken.update({
    where: { id: invite.id },
    data: { used: true },
  });

  await signIn("credentials", {
    email: invite.email,
    password,
    redirectTo: "/dashboard",
  });
}
