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
import { createTranslator, type MessageKey } from "@/lib/i18n/messages";
import { updateUserLocale } from "@/actions/locale";
import { setClientLocaleCookies } from "@/lib/i18n/client-cookies";

type LocaleContextValue = {
  locale: Locale;
  countryCode: string;
  setLocale: (locale: Locale, countryCode?: string) => Promise<void>;
  t: (key: MessageKey, vars?: Record<string, string>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

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

  // 서버(세션 DB) 기준으로 클라이언트 state·쿠키 동기화 — 게스트 en 쿠키가 로그인 locale을 덮지 않음
  useEffect(() => {
    const nextLocale = normalizeLocale(initialLocale);
    const nextCountry = initialCountryCode.toUpperCase();
    setLocaleState(nextLocale);
    setCountryCode(nextCountry);
    setClientLocaleCookies(nextLocale, nextCountry);
  }, [initialLocale, initialCountryCode]);

  const setLocale = useCallback(
    async (next: Locale, nextCountry?: string) => {
      const country = (nextCountry ?? countryCode).toUpperCase();
      setLocaleState(next);
      setCountryCode(country);
      setClientLocaleCookies(next, country);
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
