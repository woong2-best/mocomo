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
  COUNTRY_COOKIE,
  DEFAULT_GUEST_COUNTRY,
  DEFAULT_GUEST_LOCALE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator, prefetchLocaleTable, type MessageKey } from "@/lib/i18n/messages";
import { updateUserLocale } from "@/actions/locale";
import { readClientCookie, setClientLocaleCookies } from "@/lib/i18n/client-cookies";
import { DEFAULT_TIMEZONE, normalizeTimeZone, TIMEZONE_COOKIE } from "@/lib/i18n/timezone";

type LocaleContextValue = {
  locale: Locale;
  countryCode: string;
  timeZone: string;
  setLocale: (locale: Locale, countryCode?: string, timeZone?: string) => Promise<void>;
  hydrateFromSession: (locale: Locale, countryCode: string, timeZone: string) => void;
  t: (key: MessageKey, vars?: Record<string, string>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyDocumentLang(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_GUEST_LOCALE,
  initialCountryCode = DEFAULT_GUEST_COUNTRY,
  initialTimeZone,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
  initialCountryCode?: string;
  initialTimeZone?: string;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale, DEFAULT_GUEST_LOCALE));
  const [countryCode, setCountryCode] = useState(initialCountryCode.toUpperCase());
  const [timeZone, setTimeZone] = useState(normalizeTimeZone(initialTimeZone));
  const [, startTransition] = useTransition();

  useEffect(() => {
    const cookieCountry = readClientCookie(COUNTRY_COOKIE)?.toUpperCase();
    const cookieTz = readClientCookie(TIMEZONE_COOKIE);
    if (cookieCountry) setCountryCode(cookieCountry);
    if (cookieTz) setTimeZone(normalizeTimeZone(cookieTz));
    applyDocumentLang(locale);
  }, [locale]);

  const hydrateFromSession = useCallback(
    (next: Locale, nextCountry: string, nextTimeZone: string) => {
      const country = nextCountry.toUpperCase();
      const tz = normalizeTimeZone(nextTimeZone);
      setLocaleState(next);
      setCountryCode(country);
      setTimeZone(tz);
      setClientLocaleCookies(next, country, tz);
      prefetchLocaleTable(next);
      applyDocumentLang(next);
    },
    []
  );

  const setLocale = useCallback(
    async (next: Locale, nextCountry?: string, nextTimeZone?: string) => {
      const country = (nextCountry ?? countryCode).toUpperCase();
      const tz = normalizeTimeZone(nextTimeZone ?? timeZone);
      setLocaleState(next);
      setCountryCode(country);
      setTimeZone(tz);
      setClientLocaleCookies(next, country, tz);
      prefetchLocaleTable(next);
      applyDocumentLang(next);
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
      hydrateFromSession,
      t: createTranslator(locale),
    }),
    [locale, countryCode, timeZone, setLocale, hydrateFromSession]
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
      hydrateFromSession: () => {},
      t: createTranslator(locale),
    };
  }
  return ctx;
}
