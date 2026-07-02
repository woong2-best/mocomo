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
  LOCALE_COOKIE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator, type MessageKey } from "@/lib/i18n/messages";
import { updateUserLocale } from "@/actions/locale";
import { isLocale } from "@/lib/i18n/config";

type LocaleContextValue = {
  locale: Locale;
  countryCode: string;
  setLocale: (locale: Locale, countryCode?: string) => Promise<void>;
  t: (key: MessageKey, vars?: Record<string, string>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function setClientCookies(locale: Locale, countryCode: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
  document.cookie = `${COUNTRY_COOKIE}=${countryCode};path=/;max-age=${maxAge};SameSite=Lax`;
}

function readClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function LocaleProvider({
  children,
  initialLocale,
  initialCountryCode,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialCountryCode: string;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));
  const [countryCode, setCountryCode] = useState(initialCountryCode.toUpperCase());
  const [, startTransition] = useTransition();

  // 서버(세션 DB)와 쿠키가 어긋날 때 — 사용자가 고른 쿠키 locale 우선
  useEffect(() => {
    const cookieLocale = readClientCookie(LOCALE_COOKIE);
    const cookieCountry = readClientCookie(COUNTRY_COOKIE);
    if (cookieLocale && isLocale(cookieLocale) && cookieLocale !== locale) {
      setLocaleState(cookieLocale);
    }
    if (cookieCountry) {
      const next = cookieCountry.toUpperCase();
      if (next !== countryCode) setCountryCode(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount sync only
  }, []);

  const setLocale = useCallback(
    async (next: Locale, nextCountry?: string) => {
      const country = (nextCountry ?? countryCode).toUpperCase();
      setLocaleState(next);
      setCountryCode(country);
      setClientCookies(next, country);
      await updateUserLocale({ locale: next, countryCode: country });
      startTransition(() => router.refresh());
    },
    [countryCode, router]
  );

  const value = useMemo(
    () => ({
      locale,
      countryCode,
      setLocale,
      t: createTranslator(locale),
    }),
    [locale, countryCode, setLocale]
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
      setLocale: async () => {},
      t: createTranslator(locale),
    };
  }
  return ctx;
}
