import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_GUEST_LOCALE, normalizeLocale } from "@/lib/i18n/config";
import type { HumanChallengeQuestion } from "@/lib/human-challenge-types";

export const SIGNUP_DRAFT_SESSION_KEY = "mocomo_signup_draft";
export const SIGNUP_CHALLENGE_SESSION_KEY = "mocomo_signup_challenge";

export type SignupDraft = {
  email: string;
  username: string;
  password: string;
  name?: string;
  locale: Locale;
  countryCode: string;
  timeZone: string;
  homeFloor: number;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
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
    if (typeof parsed.homeFloor !== "number") {
      parsed.homeFloor = 500;
    }
    if (
      typeof parsed.birthYear !== "number" ||
      typeof parsed.birthMonth !== "number" ||
      typeof parsed.birthDay !== "number"
    ) {
      return null;
    }
    parsed.locale = normalizeLocale(parsed.locale, DEFAULT_GUEST_LOCALE);
    if (!parsed.timeZone) {
      parsed.timeZone = "UTC";
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(SIGNUP_DRAFT_SESSION_KEY);
  sessionStorage.removeItem(SIGNUP_CHALLENGE_SESSION_KEY);
}

export function saveSignupChallenge(challenge: HumanChallengeQuestion, locale: Locale): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    SIGNUP_CHALLENGE_SESSION_KEY,
    JSON.stringify({ challenge, locale } satisfies StoredSignupChallenge)
  );
}

export type StoredSignupChallenge = {
  challenge: HumanChallengeQuestion;
  locale: Locale;
};

export function loadSignupChallenge(): StoredSignupChallenge | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(SIGNUP_CHALLENGE_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSignupChallenge | HumanChallengeQuestion;
    if ("challenge" in parsed && parsed.challenge?.token) {
      return parsed;
    }
    if ("token" in parsed && parsed.token) {
      return null;
    }
    return null;
  } catch {
    return null;
  }
}
