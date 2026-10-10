"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  hasExplicitLocalPostTranslate,
  inferPostTranslateInto,
  POST_TRANSLATE_OFF,
  readLocalPostTranslateInto,
  resolveClientPostTranslateInto,
  writeLocalPostTranslateInto,
  type PostTranslateInto,
} from "@/lib/post-translate";

type PostTranslateContextValue = {
  preference: PostTranslateInto;
  hydrateFromSession: (value: string | null | undefined) => void;
  setPreferenceLocal: (value: PostTranslateInto) => void;
};

const PostTranslateContext = createContext<PostTranslateContextValue | null>(null);

export function PostTranslateProvider({ children }: { children: ReactNode }) {
  const { countryCode } = useLocale();
  const [preference, setPreference] = useState<PostTranslateInto>(POST_TRANSLATE_OFF);
  const [explicit, setExplicit] = useState(false);

  useEffect(() => {
    if (explicit) return;
    if (hasExplicitLocalPostTranslate()) {
      const stored = readLocalPostTranslateInto();
      if (stored) {
        setPreference(stored);
        setExplicit(true);
        return;
      }
    }
    const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "";
    setPreference(inferPostTranslateInto(browserLanguage, countryCode));
  }, [countryCode, explicit]);

  const hydrateFromSession = useCallback((value: string | null | undefined) => {
    if (value == null || value === "") return;
    const next = resolveClientPostTranslateInto(value, "", "");
    if (!value) return;
    setPreference(next);
    setExplicit(true);
    writeLocalPostTranslateInto(next, true);
  }, []);

  const setPreferenceLocal = useCallback((value: PostTranslateInto) => {
    setPreference(value);
    setExplicit(true);
    writeLocalPostTranslateInto(value, true);
  }, []);

  const context = useMemo(
    () => ({ preference, hydrateFromSession, setPreferenceLocal }),
    [preference, hydrateFromSession, setPreferenceLocal]
  );

  return <PostTranslateContext.Provider value={context}>{children}</PostTranslateContext.Provider>;
}

export function usePostTranslate(): PostTranslateContextValue {
  const ctx = useContext(PostTranslateContext);
  if (!ctx) {
    return {
      preference: inferPostTranslateInto(
        typeof navigator !== "undefined" ? navigator.language : "",
        ""
      ),
      hydrateFromSession: () => undefined,
      setPreferenceLocal: () => undefined,
    };
  }
  return ctx;
}
