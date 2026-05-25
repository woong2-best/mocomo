import { getAuthUrl } from "@/lib/auth-env";

export function getAppBaseUrl(): string {
  return getAuthUrl() ?? "http://localhost:3000";
}

export function verifyTokenIdentifier(email: string): string {
  return `verify:${email.trim().toLowerCase()}`;
}

export function resetTokenIdentifier(email: string): string {
  return `reset:${email.trim().toLowerCase()}`;
}

export function verifyCodeIdentifier(email: string): string {
  return `verify-code:${email.trim().toLowerCase()}`;
}

export function resetCodeIdentifier(email: string): string {
  return `reset-code:${email.trim().toLowerCase()}`;
}

/** Unified 6-digit code for signup verify + password reset */
export function authCodeIdentifier(email: string): string {
  return `auth-code:${email.trim().toLowerCase()}`;
}

export const SIGNUP_PASSWORD_SESSION_KEY = "mocomo_signup_password";

export function generateEmailCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
