import nodemailer from "nodemailer";

/**
 * Gmail SMTP transporter (same pattern as typical Nodemailer + Gmail guides).
 * Use an App Password for SMTP_PASS — not your normal Gmail password.
 */
export function getTransporter() {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      "Missing Gmail SMTP auth. Set SMTP_USER (your Gmail) and SMTP_PASS (App Password)",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    requireTLS: port === 587,
    auth: {
      user,
      pass,
    },
  });
}
