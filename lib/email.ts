import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  coachName: string
) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "FitCoach Pro <onboarding@resend.dev>",
    to,
    subject: `${coachName} invited you to FitCoach Pro`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">You're invited to FitCoach Pro</h2>
        <p style="color: #6b7280; margin-bottom: 24px;">
          ${coachName} has invited you to join as a client. Set up your account to view your workout programs and track your progress.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
          Set Up Your Account
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 32px;">
          This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send invite email:", error);
    throw new Error("Failed to send invite email");
  }
}
