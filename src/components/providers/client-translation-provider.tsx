"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ClientTranslateResult } from "@/lib/client-translate/engine";

type LoadState = {
  status: "idle" | "loading" | "ready" | "error";
  progress: number;
};

type ClientTranslationContextValue = {
  loadState: LoadState;
  warmUp: (targetLang?: string) => void;
  prefetch: (text: string, targetLang: string) => void;
  lookup: (text: string, targetLang: string) => Promise<ClientTranslateResult | null>;
  translate: (
    text: string,
    targetLang: string,
    priority?: number
  ) => Promise<ClientTranslateResult | null>;
};

const ClientTranslationContext = createContext<ClientTranslationContextValue | null>(null);

export function ClientTranslationProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle", progress: 0 });

  const subscribeLoad = useCallback(async () => {
    const engine = await import("@/lib/client-translate/engine");
    return engine.subscribeTranslationLoad((event) => {
      setLoadState({
        status: event.status as LoadState["status"],
        progress: event.progress ?? 0,
      });
    });
  }, []);

  const warmUp = useCallback(
    (targetLang?: string) => {
      void import("@/lib/client-translate/engine")
        .then(async (engine) => {
          const unsub = await subscribeLoad();
          try {
            await engine.warmClientTranslationModel(targetLang);
          } finally {
            unsub();
          }
        })
        .catch(() => {
          setLoadState((prev) => ({ ...prev, status: "error" }));
        });
    },
    [subscribeLoad]
  );

  const prefetch = useCallback((text: string, targetLang: string) => {
    void import("@/lib/client-translate/engine")
      .then((engine) => engine.prefetchClientTranslationModel(text, targetLang))
      .catch(() => undefined);
  }, []);

  const lookup = useCallback(async (text: string, targetLang: string) => {
    const engine = await import("@/lib/client-translate/engine");
    return engine.lookupCachedClientTranslation(text, targetLang);
  }, []);

  const translate = useCallback(
    async (text: string, targetLang: string, priority = 1) => {
      const engine = await import("@/lib/client-translate/engine");
      const unsub = engine.subscribeTranslationLoad((event) => {
        setLoadState({
          status: event.status as LoadState["status"],
          progress: event.progress ?? 0,
        });
      });
      try {
        return await engine.translateTextClientSide(text, targetLang, { priority });
      } finally {
        unsub();
      }
    },
    []
  );

  const value = useMemo(
    () => ({ loadState, warmUp, prefetch, lookup, translate }),
    [loadState, warmUp, prefetch, lookup, translate]
  );

  return (
    <ClientTranslationContext.Provider value={value}>
      {children}
    </ClientTranslationContext.Provider>
  );
}

export function useClientTranslation(): ClientTranslationContextValue {
  const ctx = useContext(ClientTranslationContext);
  if (!ctx) {
    throw new Error("useClientTranslation must be used within ClientTranslationProvider");
  }
  return ctx;
}

/** Optional hook — returns null when provider is absent (SSR-safe guard). */
export function useClientTranslationOptional(): ClientTranslationContextValue | null {
  return useContext(ClientTranslationContext);
}
