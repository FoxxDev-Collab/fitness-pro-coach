import nodemailer from "nodemailer";

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const emailFrom = () => process.env.EMAIL_FROM || "Praevio <noreply@praevio.app>";
const baseUrl = () => process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";

function emailWrapper(title: string, body: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${title}</h2>
      ${body}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Praevio
      </p>
    </div>
  `;
}

async function send(to: string, subject: string, html: string) {
  const transport = getTransport();
  try {
    await transport.sendMail({
      from: emailFrom(),
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Email send failed:", error);
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${baseUrl()}/verify-email/${token}`;
  await send(
    to,
    "Verify your email - Praevio",
    emailWrapper(
      "Verify your email",
      `
        <p style="color: #6b7280; margin-bottom: 24px;">
          Click the button below to verify your email address and activate your account.
        </p>
        <a href="${url}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Verify Email
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          This link expires in 24 hours.
        </p>
      `
    )
  );
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${baseUrl()}/reset-password/${token}`;
  await send(
    to,
    "Reset your password - Praevio",
    emailWrapper(
      "Reset your password",
      `
        <p style="color: #6b7280; margin-bottom: 24px;">
          Someone requested a password reset for your account. If this wasn't you, ignore this email.
        </p>
        <a href="${url}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Reset Password
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          This link expires in 1 hour.
        </p>
      `
    )
  );
}

export async function sendProgramAssignedEmail(
  to: string,
  clientName: string,
  programName: string,
  coachName: string
) {
  await send(
    to,
    `New program assigned - Praevio`,
    emailWrapper(
      "New Program Assigned",
      `
        <p style="color: #6b7280; margin-bottom: 24px;">
          Hey ${clientName}, ${coachName} has assigned you a new program: <strong>${programName}</strong>.
          Log in to start your workouts!
        </p>
        <a href="${baseUrl()}/dashboard" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          View Program
        </a>
      `
    )
  );
}

export async function sendNoteAddedEmail(
  to: string,
  clientName: string,
  coachName: string,
  notePreview: string
) {
  await send(
    to,
    `New note from ${coachName} - Praevio`,
    emailWrapper(
      "New Note from Your Coach",
      `
        <p style="color: #6b7280; margin-bottom: 16px;">
          Hey ${clientName}, ${coachName} left you a note:
        </p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #374151;">${notePreview}</p>
        </div>
        <a href="${baseUrl()}/dashboard" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          View Dashboard
        </a>
      `
    )
  );
}

export async function sendSessionCompletedEmail(
  to: string,
  clientName: string,
  workoutName: string,
  date: Date
) {
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  await send(
    to,
    `${clientName} completed a workout - Praevio`,
    emailWrapper(
      "Session Completed",
      `
        <p style="color: #6b7280; margin-bottom: 24px;">
          ${clientName} just completed <strong>${workoutName}</strong> on ${dateStr}.
        </p>
        <a href="${baseUrl()}/clients" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          View Client Progress
        </a>
      `
    )
  );
}

export async function sendTeamEventEmail(
  to: string,
  teamName: string,
  eventTitle: string,
  eventType: string,
  startTime: Date,
  location?: string
) {
  const dateStr = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const locationLine = location
    ? `<p style="color: #6b7280; margin: 4px 0;">📍 ${location}</p>`
    : "";

  await send(
    to,
    `${teamName}: ${eventTitle} - Praevio`,
    emailWrapper(
      `${eventType.charAt(0) + eventType.slice(1).toLowerCase()} Scheduled`,
      `
        <p style="color: #6b7280; margin-bottom: 16px;">
          <strong>${teamName}</strong> has a new event:
        </p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #111827;">${eventTitle}</p>
          <p style="color: #6b7280; margin: 4px 0;">📅 ${dateStr} at ${timeStr}</p>
          ${locationLine}
        </div>
      `
    )
  );
}

export async function sendTeamAnnouncementEmail(
  to: string,
  teamName: string,
  subject: string,
  body: string
) {
  await send(
    to,
    `${teamName}: ${subject} - Praevio`,
    emailWrapper(
      subject,
      `
        <p style="color: #6b7280; margin-bottom: 16px;">
          Announcement from <strong>${teamName}</strong>:
        </p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #374151; white-space: pre-wrap;">${body}</p>
        </div>
      `
    )
  );
}

export async function sendInviteEmail(to: string, inviteUrl: string, coachName: string) {
  await send(
    to,
    `${coachName} invited you to Praevio`,
    emailWrapper(
      "You're invited to Praevio",
      `
        <p style="color: #6b7280; margin-bottom: 24px;">
          ${coachName} has invited you to join as a client. Set up your account to view your workout programs and track your progress.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Set Up Your Account
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          This link expires in 7 days.
        </p>
      `
    )
  );
}
