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

const emailFrom = () => process.env.EMAIL_FROM || "FitCoach Pro <noreply@fitcoachpro.com>";
const baseUrl = () => process.env.NEXTAUTH_URL || process.env.AUTH_URL || "http://localhost:3000";

function emailWrapper(title: string, body: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${title}</h2>
      ${body}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        FitCoach Pro
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
    "Verify your email - FitCoach Pro",
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
    "Reset your password - FitCoach Pro",
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

export async function sendInviteEmail(to: string, inviteUrl: string, coachName: string) {
  await send(
    to,
    `${coachName} invited you to FitCoach Pro`,
    emailWrapper(
      "You're invited to FitCoach Pro",
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
