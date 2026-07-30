import { createHash, randomBytes, randomInt } from "crypto";

function pepper() {
  return process.env.OTP_PEPPER ?? "dev-pepper-change-me";
}

export function hashToken(token: string) {
  return createHash("sha256").update(`${pepper()}:${token}`).digest("hex");
}

export function generateAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function generateOtpCode() {
  return String(randomInt(100000, 999999));
}

export function hashOtp(code: string) {
  return createHash("sha256").update(`${pepper()}:otp:${code}`).digest("hex");
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;
