"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_GUEST_COUNTRY,
  DEFAULT_GUEST_LOCALE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator, prefetchLocaleTable, type MessageKey } from "@/lib/i18n/messages";
import { updateUserLocale } from "@/actions/locale";
import { setClientLocaleCookies } from "@/lib/i18n/client-cookies";
import { DEFAULT_TIMEZONE, normalizeTimeZone } from "@/lib/i18n/timezone";

type LocaleContextValue = {
  locale: Locale;
  countryCode: string;
  timeZone: string;
  setLocale: (locale: Locale, countryCode?: string, timeZone?: string) => Promise<void>;
  t: (key: MessageKey, vars?: Record<string, string>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale,
  initialCountryCode,
  initialTimeZone,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialCountryCode: string;
  initialTimeZone?: string;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));
  const [countryCode, setCountryCode] = useState(initialCountryCode.toUpperCase());
  const [timeZone, setTimeZone] = useState(normalizeTimeZone(initialTimeZone));
  const [, startTransition] = useTransition();

  // 서버(세션 DB) 기준으로 클라이언트 state·쿠키 동기화 — 게스트 en 쿠키가 로그인 locale을 덮지 않음
  useEffect(() => {
    const nextLocale = normalizeLocale(initialLocale);
    const nextCountry = initialCountryCode.toUpperCase();
    const nextTz = normalizeTimeZone(initialTimeZone);
    setLocaleState(nextLocale);
    setCountryCode(nextCountry);
    setTimeZone(nextTz);
    setClientLocaleCookies(nextLocale, nextCountry, nextTz);
    prefetchLocaleTable(nextLocale);
  }, [initialLocale, initialCountryCode, initialTimeZone]);

  const setLocale = useCallback(
    async (next: Locale, nextCountry?: string, nextTimeZone?: string) => {
      const country = (nextCountry ?? countryCode).toUpperCase();
      const tz = normalizeTimeZone(nextTimeZone ?? timeZone);
      setLocaleState(next);
      setCountryCode(country);
      setTimeZone(tz);
      setClientLocaleCookies(next, country, tz);
      prefetchLocaleTable(next);
      await updateUserLocale({ locale: next, countryCode: country, timeZone: tz });
      startTransition(() => router.refresh());
    },
    [countryCode, timeZone, router]
  );

  const value = useMemo(
    () => ({
      locale,
      countryCode,
      timeZone,
      setLocale,
      t: createTranslator(locale),
    }),
    [locale, countryCode, timeZone, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    const locale = DEFAULT_GUEST_LOCALE;
    return {
      locale,
      countryCode: DEFAULT_GUEST_COUNTRY,
      timeZone: DEFAULT_TIMEZONE,
      setLocale: async () => {},
      t: createTranslator(locale),
    };
  }
  return ctx;
}
