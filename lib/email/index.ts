import { getTransporter } from "@/lib/email/transporter";

function fromAddress() {
  return (
    process.env.EMAIL_FROM ??
    (process.env.SMTP_USER
      ? `PrimeSign <${process.env.SMTP_USER}>`
      : "PrimeSign <noreply@gmail.com>")
  );
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: fromAddress(),
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

export async function sendInviteEmail(params: {
  to: string;
  recipientName: string;
  subject: string;
  token: string;
  senderEmail: string;
}) {
  const link = `${appUrl()}/sign/${params.token}`;
  await sendMail({
    to: params.to,
    subject: `Please sign: ${params.subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Document ready for you</h1>
        <p>Hi ${escapeHtml(params.recipientName)},</p>
        <p><strong>${escapeHtml(params.senderEmail)}</strong> sent you
        <strong>${escapeHtml(params.subject)}</strong> to review and sign.</p>
        <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">
          Review &amp; sign
        </a></p>
        <p style="color:#666;font-size:13px;">Or open: ${link}</p>
      </div>
    `,
  });
}

export async function sendOtpEmail(params: {
  to: string;
  recipientName: string;
  code: string;
}) {
  await sendMail({
    to: params.to,
    subject: "Your PrimeSign verification code",
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Verification code</h1>
        <p>Hi ${escapeHtml(params.recipientName)},</p>
        <p>Your one-time password is:</p>
        <p style="font-size: 32px; letter-spacing: 6px; font-weight: bold;">${params.code}</p>
        <p style="color:#666;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

export async function sendCompletedEmail(params: {
  to: string;
  subject: string;
}) {
  await sendMail({
    to: params.to,
    subject: `Completed: ${params.subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="font-size: 20px;">Envelope completed</h1>
        <p><strong>${escapeHtml(params.subject)}</strong> has been signed by all recipients.</p>
        <p><a href="${appUrl()}/dashboard">Open dashboard</a></p>
      </div>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
