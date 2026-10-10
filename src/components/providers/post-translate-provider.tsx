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
import {
  defaultPostTranslateFromBrowser,
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
  const [preference, setPreference] = useState<PostTranslateInto>(POST_TRANSLATE_OFF);

  useEffect(() => {
    const next = resolveClientPostTranslateInto(readLocalPostTranslateInto());
    setPreference(next);
    writeLocalPostTranslateInto(next);
  }, []);

  const hydrateFromSession = useCallback((value: string | null | undefined) => {
    if (value == null || value === "") return;
    const next = resolveClientPostTranslateInto(value, "");
    if (value && next) {
      setPreference(next);
      writeLocalPostTranslateInto(next);
    }
  }, []);

  const setPreferenceLocal = useCallback((value: PostTranslateInto) => {
    setPreference(value);
    writeLocalPostTranslateInto(value);
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
      preference: defaultPostTranslateFromBrowser(
        typeof navigator !== "undefined" ? navigator.language : ""
      ),
      hydrateFromSession: () => undefined,
      setPreferenceLocal: () => undefined,
    };
  }
  return ctx;
}
