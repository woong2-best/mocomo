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
import { AppState } from "react-native";
import { readDeviceLocale } from "@/i18n/device-locale";
import { englishText, interpolate } from "@/i18n/messages";
import { loadUiKeyTable, uiMessagesAppVersion } from "@/i18n/ui-key-cache";
import {
  prefetchUiTranslationModel,
  translateUiKey,
  uiKeyNeedsMlKit,
} from "@/i18n/ui-translate-service";
import { setRuntimeTranslator } from "@/i18n/runtime";
import type { Locale } from "@/i18n";
import type { TFn } from "@/i18n/types";

type I18nContextValue = {
  /** Device language used for UI ML Kit and UGC on-device translation. */
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

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
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

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const next = readDeviceLocale();
      setLocaleState((prev) => (prev === next ? prev : next));
    });
    return () => sub.remove();
  }, []);

  const scheduleKey = useCallback(
    (key: string) => {
      if (!uiKeyNeedsMlKit(key, locale)) return;
      if (scheduledRef.current.has(key)) return;
      scheduledRef.current.add(key);
      void translateUiKey(key, locale).then((translated) => {
        scheduledRef.current.delete(key);
        if (translated) {
          overlayRef.current[key] = translated;
          bump();
        }
      });
    },
    [locale, bump]
  );

  const t = useCallback<TFn>(
    (key, vars) => {
      const english = interpolate(englishText(key), vars);
      if (!uiKeyNeedsMlKit(key, locale)) return english;
      const cached = overlayRef.current[key];
      if (cached) return interpolate(cached, vars);
      scheduleKey(key);
      return english;
    },
    [locale, scheduleKey, revision]
  );

  useEffect(() => {
    setRuntimeTranslator(t);
  }, [t]);

  const setLocale = useCallback(async (next: Locale) => {
    setLocaleState(next);
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
