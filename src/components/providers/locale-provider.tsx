"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  COUNTRY_COOKIE,
  LOCALE_COOKIE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator, type MessageKey } from "@/lib/i18n/messages";
import { updateUserLocale } from "@/actions/locale";

type LocaleContextValue = {
  locale: Locale;
  countryCode: string;
  setLocale: (locale: Locale, countryCode?: string) => Promise<void>;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function setClientCookies(locale: Locale, countryCode: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
  document.cookie = `${COUNTRY_COOKIE}=${countryCode};path=/;max-age=${maxAge};SameSite=Lax`;
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
    const locale = normalizeLocale("ko");
    return {
      locale,
      countryCode: "KR",
      setLocale: async () => {},
      t: createTranslator(locale),
    };
  }
  return ctx;
}
