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

export function phoneCodeIdentifier(phoneE164: string): string {
  return `phone-code:${phoneE164}`;
}

export function scopedPhoneCodeToken(phoneE164: string, code: string): string {
  return `${phoneE164}:${code.trim()}`;
}

export function phoneCodeMatchesToken(storedToken: string, phoneE164: string, code: string): boolean {
  const c = code.trim();
  return storedToken === c || storedToken === scopedPhoneCodeToken(phoneE164, c);
}

export const SIGNUP_PASSWORD_SESSION_KEY = "mocomo_signup_password";
export const SIGNUP_LOCALE_SESSION_KEY = "mocomo_signup_locale";

export function generateEmailCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** DB token @unique 충돌 방지 — 이메일별로 코드 저장 */
export function scopedAuthCodeToken(email: string, code: string): string {
  return `${email.trim().toLowerCase()}:${code.trim()}`;
}

export function authCodeMatchesToken(storedToken: string, email: string, code: string): boolean {
  const c = code.trim();
  return storedToken === c || storedToken === scopedAuthCodeToken(email, c);
}
