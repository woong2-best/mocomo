import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/auth/AuthContext";
import { API_BASE_URL } from "@/config/env";
import {
  createMobileTranslator,
  getStoredMobileLocale,
  initMobileI18n,
  normalizeMobileLocale,
  setMobileLocale,
  type Locale,
} from "@/i18n";
import { localeForCountry } from "@/i18n/locale-from-country";
import { uiText } from "@/i18n/ui-text";

type I18nContextValue = {
  locale: Locale;
  t: (key: string, vars?: Record<string, string>) => string;
  /** Inline KO/EN for strings not in the message catalog yet. */
  u: (ko: string, en: string) => string;
  setLocale: (locale: Locale) => Promise<void>;
  ready: boolean;
};

function countryLocale(user: { locale?: string | null; countryCode?: string | null } | null) {
  if (!user?.countryCode) return null;
  return localeForCountry(user.countryCode);
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<Locale>("en");
  const [t, setT] = useState<(key: string, vars?: Record<string, string>) => string>(
    () => (key: string) => key
  );
  const [ready, setReady] = useState(false);

  const reload = useCallback(async (next: Locale) => {
    const translator = await initMobileI18n(API_BASE_URL, next);
    setT(() => translator);
    setLocaleState(next);
    setReady(true);
  }, []);

  useEffect(() => {
    void (async () => {
      const fromCountry = countryLocale(user);
      const fromUser = user?.locale ? normalizeMobileLocale(user.locale) : null;
      const stored = user ? await getStoredMobileLocale() : null;
      const initial = fromUser ?? fromCountry ?? stored ?? "en";
      await reload(initial);
    })();
  }, [user?.locale, user?.countryCode, user, reload]);

  const u = useCallback((ko: string, en: string) => uiText(locale, ko, en), [locale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      await setMobileLocale(next);
      await reload(next);
    },
    [reload]
  );

  const value = useMemo(
    () => ({ locale, t, u, setLocale, ready }),
    [locale, t, u, setLocale, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "en" as Locale,
      t: (key: string) => key,
      u: (_ko: string, en: string) => en,
      setLocale: async () => {},
      ready: false,
    };
  }
  return ctx;
}
