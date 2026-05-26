import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  COUNTRY_COOKIE,
  LOCALE_COOKIE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/messages";

export async function getRequestLocale(): Promise<Locale> {
  const session = await auth();
  if (session?.user?.locale) {
    return normalizeLocale(session.user.locale);
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  return normalizeLocale(fromCookie);
}

export async function getRequestCountryCode(): Promise<string> {
  const session = await auth();
  if (session?.user?.countryCode) {
    return session.user.countryCode;
  }
  const cookieStore = await cookies();
  return cookieStore.get(COUNTRY_COOKIE)?.value?.toUpperCase() || "KR";
}

export async function getServerTranslator() {
  const locale = await getRequestLocale();
  return { locale, t: createTranslator(locale) };
}
