import { Resend } from "resend";

let resendClient: Resend | null = null;
function getResend() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const emailFrom = () => process.env.EMAIL_FROM || "Praevio <noreply@praevio.app>";
const baseUrl = () => process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";

/**
 * Escape user-controlled text before interpolating it into email HTML. Names,
 * note/announcement bodies, event titles, etc. originate from coach input and
 * would otherwise let a malicious/compromised coach inject arbitrary HTML or
 * links into mail sent from our verified domain. Apply at every HTML
 * interpolation of untrusted text (NOT to the Subject header, which Resend
 * encodes, and NOT to app-generated URLs/tokens).
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailWrapper(title: string, body: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${escapeHtml(title)}</h2>
      ${body}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Praevio
      </p>
    </div>
  `;
}

async function send(to: string, subject: string, html: string, idempotencyKey?: string) {
  const { error } = await getResend().emails.send(
    { from: emailFrom(), to, subject, html },
    // An idempotency key lets Resend drop a duplicate send (e.g. an edit that
    // re-checks "notify", or an accidental resubmit) within its dedupe window.
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  if (error) {
    console.error("Email send failed:", error);
    throw new Error(`Failed to send email: ${error.message}`);
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
          Hey ${escapeHtml(clientName)}, ${escapeHtml(coachName)} has assigned you a new program: <strong>${escapeHtml(programName)}</strong>.
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
          Hey ${escapeHtml(clientName)}, ${escapeHtml(coachName)} left you a note:
        </p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #374151;">${escapeHtml(notePreview)}</p>
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
          ${escapeHtml(clientName)} just completed <strong>${escapeHtml(workoutName)}</strong> on ${dateStr}.
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
  location?: string,
  idempotencyKey?: string
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
    ? `<p style="color: #6b7280; margin: 4px 0;">📍 ${escapeHtml(location)}</p>`
    : "";

  await send(
    to,
    `${teamName}: ${eventTitle} - Praevio`,
    emailWrapper(
      `${eventType.charAt(0) + eventType.slice(1).toLowerCase()} Scheduled`,
      `
        <p style="color: #6b7280; margin-bottom: 16px;">
          <strong>${escapeHtml(teamName)}</strong> has a new event:
        </p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #111827;">${escapeHtml(eventTitle)}</p>
          <p style="color: #6b7280; margin: 4px 0;">📅 ${dateStr} at ${timeStr}</p>
          ${locationLine}
        </div>
      `
    ),
    idempotencyKey
  );
}

export async function sendTeamAnnouncementEmail(
  to: string,
  teamName: string,
  subject: string,
  body: string,
  idempotencyKey?: string
) {
  await send(
    to,
    `${teamName}: ${subject} - Praevio`,
    emailWrapper(
      subject,
      `
        <p style="color: #6b7280; margin-bottom: 16px;">
          Announcement from <strong>${escapeHtml(teamName)}</strong>:
        </p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; color: #374151; white-space: pre-wrap;">${escapeHtml(body)}</p>
        </div>
      `
    ),
    idempotencyKey
  );
}

/**
 * Passwordless portal sign-in link (parents + athletes). The URL contains a
 * single-use token and is app-generated (not escaped); `teamName` is coach
 * input and IS escaped.
 */
export async function sendPortalMagicLinkEmail(
  to: string,
  verifyUrl: string,
  teamName?: string | null,
) {
  const context = teamName
    ? `to view <strong>${escapeHtml(teamName)}</strong>'s schedule and results`
    : "to view your team's schedule and results";
  await send(
    to,
    "Your Praevio sign-in link",
    emailWrapper(
      "Sign in to Praevio",
      `
        <p style="color: #6b7280; margin-bottom: 24px;">
          Tap the button below ${context}. No password needed.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Open Praevio
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          This link expires in 30 minutes and can be used once. If you didn't request it, you can ignore this email.
        </p>
      `
    ),
    // Dedupe accidental double-requests within Resend's window.
    `portal-magic:${to}:${verifyUrl.slice(-16)}`,
  );
}

/**
 * The team's portal join link, sent by a coach to all parents/athletes. Leads
 * to `/join/{code}` where the recipient enters their email to get a sign-in
 * link. `teamName` is coach input and IS escaped; `joinUrl` is app-generated.
 */
export async function sendPortalJoinLinkEmail(
  to: string,
  joinUrl: string,
  teamName: string,
) {
  await send(
    to,
    `Join ${teamName} on Praevio`,
    emailWrapper(
      "Follow your team on Praevio",
      `
        <p style="color: #6b7280; margin-bottom: 24px;">
          <strong>${escapeHtml(teamName)}</strong> is on Praevio. Tap below and enter this email
          address to see the schedule, results, and announcements on your phone — no password needed.
        </p>
        <a href="${joinUrl}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Join ${escapeHtml(teamName)}
        </a>
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
          ${escapeHtml(coachName)} has invited you to join as a client. Set up your account to view your workout programs and track your progress.
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

export async function sendAdminInviteEmail(to: string, token: string, inviterName: string) {
  const url = `${baseUrl()}/invite/admin/${token}`;
  await send(
    to,
    "You've been invited to Praevio Admin",
    emailWrapper(
      "Praevio admin invitation",
      `
        <p style="color: #6b7280; margin-bottom: 24px;">
          ${escapeHtml(inviterName)} has invited you to administer the Praevio platform. Click below to set your password and activate your admin account.
        </p>
        <a href="${url}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Activate admin account
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          This link expires in 7 days. If you weren't expecting this, you can ignore the email.
        </p>
      `
    )
  );
}
