import type { Locale } from "@/lib/i18n/config";

export const SIGNUP_DRAFT_SESSION_KEY = "mocomo_signup_draft";

export type SignupDraft = {
  email: string;
  username: string;
  password: string;
  name?: string;
  locale: Locale;
  countryCode: string;
};

export function saveSignupDraft(draft: SignupDraft): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SIGNUP_DRAFT_SESSION_KEY, JSON.stringify(draft));
}

export function loadSignupDraft(): SignupDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(SIGNUP_DRAFT_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SignupDraft;
    if (!parsed.email || !parsed.username || !parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SIGNUP_DRAFT_SESSION_KEY);
}
