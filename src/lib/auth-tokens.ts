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

export function generateEmailCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
