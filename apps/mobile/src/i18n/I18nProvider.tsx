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

type I18nContextValue = {
  locale: Locale;
  t: (key: string, vars?: Record<string, string>) => string;
  setLocale: (locale: Locale) => Promise<void>;
  ready: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<Locale>("en");
  const [t, setT] = useState<(key: string, vars?: Record<string, string>) => string>(
    () => (key) => key
  );
  const [ready, setReady] = useState(false);

  const reload = useCallback(async (next: Locale) => {
    const translator = await initMobileI18n(API_BASE_URL, next);
    setT(() => translator);
    setLocaleState(next);
    setReady(true);
  }, []);

  useEffect(() => {
    const fromUser = user?.locale ? normalizeMobileLocale(user.locale) : null;
    void (async () => {
      const stored = await getStoredMobileLocale();
      const initial = fromUser ?? stored;
      await reload(initial);
    })();
  }, [user?.locale, reload]);

  const setLocale = useCallback(
    async (next: Locale) => {
      await setMobileLocale(next);
      await reload(next);
    },
    [reload]
  );

  const value = useMemo(
    () => ({ locale, t, setLocale, ready }),
    [locale, t, setLocale, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "en" as Locale,
      t: (key: string) => key,
      setLocale: async () => {},
      ready: false,
    };
  }
  return ctx;
}
