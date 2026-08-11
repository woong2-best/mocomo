import { cache } from "react";
import { cookies } from "next/headers";
import { getCachedSession } from "@/lib/auth";
import {
  COUNTRY_COOKIE,
  DEFAULT_GUEST_COUNTRY,
  DEFAULT_GUEST_LOCALE,
  DEFAULT_USER_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/messages";
import {
  DEFAULT_TIMEZONE,
  TIMEZONE_COOKIE,
  normalizeTimeZone,
} from "@/lib/i18n/timezone";

import { SESSION_COOKIE_BASE_NAMES } from "@/lib/account-switch/session-cookies";

const SESSION_COOKIES = [...SESSION_COOKIE_BASE_NAMES];

function hasSessionCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return SESSION_COOKIES.some((name) => cookieStore.get(name)?.value);
}

/** 요청당 auth 1회 · 비로그인은 쿠키만 (레이아웃 TTFB 개선) */
export const getRequestI18n = cache(
  async (): Promise<{ locale: Locale; countryCode: string; timeZone: string }> => {
    const cookieStore = await cookies();
    const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const rawCountry = cookieStore.get(COUNTRY_COOKIE)?.value?.toUpperCase();
    const rawTz = cookieStore.get(TIMEZONE_COOKIE)?.value;
    const cookieLocale = rawLocale && isLocale(rawLocale) ? rawLocale : null;
    const cookieTz = rawTz ? normalizeTimeZone(decodeURIComponent(rawTz)) : null;

    if (!hasSessionCookie(cookieStore)) {
      return {
        locale: cookieLocale ?? DEFAULT_GUEST_LOCALE,
        countryCode: rawCountry || DEFAULT_GUEST_COUNTRY,
        timeZone: cookieTz ?? DEFAULT_TIMEZONE,
      };
    }

    const session = await getCachedSession();
    // 로그인: DB/세션 locale 우선 (가입 전 en 쿠키가 ko 설정을 덮어쓰지 않음)
    return {
      locale: normalizeLocale(session?.user?.locale ?? cookieLocale, DEFAULT_USER_LOCALE),
      countryCode: session?.user?.countryCode ?? rawCountry ?? DEFAULT_GUEST_COUNTRY,
      timeZone: normalizeTimeZone(session?.user?.timeZone ?? cookieTz),
    };
  }
);

export async function getRequestLocale(): Promise<Locale> {
  const { locale } = await getRequestI18n();
  return locale;
}

export async function getRequestCountryCode(): Promise<string> {
  const { countryCode } = await getRequestI18n();
  return countryCode;
}

export async function getRequestTimeZone(): Promise<string> {
  const { timeZone } = await getRequestI18n();
  return timeZone;
}

export async function getServerTranslator() {
  const { locale } = await getRequestI18n();
  return { locale, t: createTranslator(locale) };
}
