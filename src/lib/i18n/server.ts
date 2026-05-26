import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  COUNTRY_COOKIE,
  LOCALE_COOKIE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/messages";

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSessionCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return SESSION_COOKIES.some((name) => cookieStore.get(name)?.value);
}

/** 요청당 auth 1회 · 비로그인은 쿠키만 (레이아웃 TTFB 개선) */
export const getRequestI18n = cache(async (): Promise<{ locale: Locale; countryCode: string }> => {
  const cookieStore = await cookies();
  const fromCookieLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const fromCookieCountry = cookieStore.get(COUNTRY_COOKIE)?.value?.toUpperCase() || "KR";

  if (!hasSessionCookie(cookieStore)) {
    return { locale: fromCookieLocale, countryCode: fromCookieCountry };
  }

  const session = await auth();
  return {
    locale: normalizeLocale(session?.user?.locale ?? fromCookieLocale),
    countryCode: session?.user?.countryCode ?? fromCookieCountry,
  };
});

export async function getRequestLocale(): Promise<Locale> {
  const { locale } = await getRequestI18n();
  return locale;
}

export async function getRequestCountryCode(): Promise<string> {
  const { countryCode } = await getRequestI18n();
  return countryCode;
}

export async function getServerTranslator() {
  const { locale } = await getRequestI18n();
  return { locale, t: createTranslator(locale) };
}
