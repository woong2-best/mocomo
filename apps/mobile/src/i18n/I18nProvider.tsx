import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getStoredMobileLocale, setMobileLocale, type Locale } from "@/i18n";
import { readDeviceLocale } from "@/i18n/device-locale";
import { englishText, interpolate } from "@/i18n/messages";
import { loadUiKeyTable, uiMessagesAppVersion } from "@/i18n/ui-key-cache";
import {
  prefetchUiTranslationModel,
  translateUiKey,
  uiKeyNeedsMlKit,
} from "@/i18n/ui-translate-service";
import { setRuntimeTranslator } from "@/i18n/runtime";
import type { TFn } from "@/i18n/types";

type I18nContextValue = {
  /** Account / settings language used for UI ML Kit and UGC on-device translation. */
  locale: Locale;
  t: TFn;
  /** @deprecated Use `t("key")` — kept for a few legacy call sites during migration. */
  u: TFn;
  setLocale: (locale: Locale) => Promise<void>;
  ready: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readDeviceLocale());
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const overlayRef = useRef<Record<string, string>>({});
  const scheduledRef = useRef(new Set<string>());
  const localeRef = useRef(locale);
  const chosenRef = useRef(false);
  localeRef.current = locale;

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await getStoredMobileLocale();
      if (cancelled || !stored || chosenRef.current) return;
      setLocaleState((prev) => (prev === stored ? prev : stored));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scheduledRef.current.clear();
    let cancelled = false;
    void (async () => {
      overlayRef.current = await loadUiKeyTable(locale, uiMessagesAppVersion());
      if (!cancelled) {
        setReady(true);
        bump();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, bump]);

  useEffect(() => {
    void prefetchUiTranslationModel(locale);
  }, [locale]);

  const scheduleKey = useCallback(
    (key: string, targetLocale: Locale) => {
      if (!uiKeyNeedsMlKit(key, targetLocale)) return;
      if (scheduledRef.current.has(key)) return;
      scheduledRef.current.add(key);
      void translateUiKey(key, targetLocale).then((translated) => {
        scheduledRef.current.delete(key);
        if (!translated || localeRef.current !== targetLocale) return;
        overlayRef.current[key] = translated;
        bump();
      });
    },
    [bump]
  );

  const t = useCallback<TFn>(
    (key, vars) => {
      const english = interpolate(englishText(key), vars);
      if (!uiKeyNeedsMlKit(key, locale)) return english;
      const cached = overlayRef.current[key];
      if (cached) return interpolate(cached, vars);
      scheduleKey(key, locale);
      return english;
    },
    [locale, scheduleKey, revision]
  );

  useEffect(() => {
    setRuntimeTranslator(t);
  }, [t]);

  const setLocale = useCallback(async (next: Locale) => {
    chosenRef.current = true;
    setLocaleState(next);
    await setMobileLocale(next);
  }, []);

  const value = useMemo(
    () => ({ locale, t, u: t, setLocale, ready }),
    [locale, t, setLocale, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const fallback: TFn = (key, vars) => interpolate(englishText(key), vars);
    return {
      locale: "en" as Locale,
      t: fallback,
      u: fallback,
      setLocale: async () => {},
      ready: false,
    };
  }
  return ctx;
}
