import {
  COUNTRY_COOKIE,
  DEFAULT_GUEST_COUNTRY,
  DEFAULT_GUEST_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import { SIGNUP_LOCALE_SESSION_KEY } from "@/lib/auth-tokens";
import { TIMEZONE_COOKIE, normalizeTimeZone } from "@/lib/i18n/timezone";

/** 가입 플로우 — 언어/국가/타임존 선택을 즉시 쿠키에 반영 (다음 단계 UI용) */
export function syncSignupLocaleClient(
  locale: Locale,
  countryCode: string,
  timeZone?: string
): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
  document.cookie = `${COUNTRY_COOKIE}=${countryCode.toUpperCase()};path=/;max-age=${maxAge};SameSite=Lax`;
  if (timeZone) {
    const tz = normalizeTimeZone(timeZone);
    document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(tz)};path=/;max-age=${maxAge};SameSite=Lax`;
  }
}

export function readClientLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const raw = match ? decodeURIComponent(match[1]) : null;
  return raw && isLocale(raw) ? raw : null;
}

export function readClientCountryCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([^;]*)`));
  const raw = match ? decodeURIComponent(match[1]).toUpperCase() : null;
  return raw || null;
}

export function readSignupLocaleStorage(): Locale | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SIGNUP_LOCALE_SESSION_KEY);
    return raw && isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveSignupLocaleStorage(locale: Locale): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SIGNUP_LOCALE_SESSION_KEY, locale);
  } catch {
    /* private mode */
  }
}

export function clearSignupLocaleStorage(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(SIGNUP_LOCALE_SESSION_KEY);
  } catch {
    /* private mode */
  }
}

/** 가입 플로우 UI용 locale — URL > sessionStorage > English (never guest cookie). */
export function resolveSignupFlowLocale(paramLocale?: string | null): Locale {
  if (paramLocale && isLocale(paramLocale)) return paramLocale;
  return readSignupLocaleStorage() ?? DEFAULT_GUEST_LOCALE;
}

/** 이메일 인증 페이지 — 비밀번호 찾기는 sessionStorage 가입 locale 무시 */
export function resolveEmailVerifyLocale(
  mode: "signup" | "reset",
  paramLocale?: string | null
): Locale {
  if (paramLocale && isLocale(paramLocale)) return paramLocale;
  if (mode === "signup") {
    const stored = readSignupLocaleStorage();
    if (stored) return stored;
  }
  return DEFAULT_GUEST_LOCALE;
}

export function resolveSignupFlowCountry(): string {
  return readClientCountryCookie() ?? DEFAULT_GUEST_COUNTRY;
}

export function normalizeSignupLocale(value?: string | null): Locale {
  return normalizeLocale(value, DEFAULT_GUEST_LOCALE);
}
