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
import type { ClientTranslateResult } from "@/lib/client-translate/engine";

type LoadState = {
  status: "idle" | "loading" | "ready" | "error";
  progress: number;
};

type ClientTranslationActions = {
  warmUp: (targetLang?: string) => void;
  prefetch: (text: string, targetLang: string) => void;
  lookup: (text: string, targetLang: string) => Promise<ClientTranslateResult | null>;
  translate: (
    text: string,
    targetLang: string,
    priority?: number
  ) => Promise<ClientTranslateResult | null>;
};

const ActionsContext = createContext<ClientTranslationActions | null>(null);
const LoadContext = createContext<LoadState>({ status: "idle", progress: 0 });

export function ClientTranslationProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle", progress: 0 });

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    void import("@/lib/client-translate/engine").then((engine) => {
      if (cancelled) return;
      unsub = engine.subscribeTranslationLoad((event) => {
        setLoadState((prev) => {
          const status = event.status as LoadState["status"];
          const progress = event.progress ?? prev.progress;
          if (prev.status === status && prev.progress === progress) return prev;
          return { status, progress };
        });
      });
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const warmUp = useCallback((targetLang?: string) => {
    void import("@/lib/client-translate/engine")
      .then((engine) => engine.warmClientTranslationModel(targetLang))
      .catch(() => {
        setLoadState((prev) => (prev.status === "error" ? prev : { ...prev, status: "error" }));
      });
  }, []);

  const prefetch = useCallback((text: string, targetLang: string) => {
    void import("@/lib/client-translate/engine")
      .then((engine) => engine.prefetchClientTranslationModel(text, targetLang))
      .catch(() => undefined);
  }, []);

  const lookup = useCallback(async (text: string, targetLang: string) => {
    const engine = await import("@/lib/client-translate/engine");
    return engine.lookupCachedClientTranslation(text, targetLang);
  }, []);

  const translate = useCallback(async (text: string, targetLang: string, priority = 1) => {
    const engine = await import("@/lib/client-translate/engine");
    return engine.translateTextClientSide(text, targetLang, { priority });
  }, []);

  const actions = useMemo(
    () => ({ warmUp, prefetch, lookup, translate }),
    [warmUp, prefetch, lookup, translate]
  );

  return (
    <ActionsContext.Provider value={actions}>
      <LoadContext.Provider value={loadState}>{children}</LoadContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useClientTranslation(): ClientTranslationActions & { loadState: LoadState } {
  const actions = useContext(ActionsContext);
  const loadState = useContext(LoadContext);
  if (!actions) {
    throw new Error("useClientTranslation must be used within ClientTranslationProvider");
  }
  return { ...actions, loadState };
}

/** Stable action callbacks. Load progress lives in `useClientTranslationLoad`. */
export function useClientTranslationOptional(): ClientTranslationActions | null {
  return useContext(ActionsContext);
}

export function useClientTranslationLoad(): LoadState {
  return useContext(LoadContext);
}
