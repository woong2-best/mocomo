"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "@/lib/i18n/config";
import type { ClientTranslateResult } from "@/lib/client-translate/engine";

type LoadState = {
  status: "idle" | "loading" | "ready" | "error";
  progress: number;
};

type ClientTranslationContextValue = {
  loadState: LoadState;
  warmUp: () => void;
  translate: (text: string, targetLocale: Locale) => Promise<ClientTranslateResult | null>;
};

const ClientTranslationContext = createContext<ClientTranslationContextValue | null>(null);

export function ClientTranslationProvider({ children }: { children: ReactNode }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle", progress: 0 });

  const warmUp = useCallback(() => {
    void import("@/lib/client-translate/engine")
      .then(async (engine) => {
        const unsub = engine.subscribeTranslationLoad((event) => {
          setLoadState({
            status: event.status as LoadState["status"],
            progress: event.progress ?? 0,
          });
        });
        try {
          await engine.warmClientTranslationModel();
        } finally {
          unsub();
        }
      })
      .catch(() => {
        setLoadState((prev) => ({ ...prev, status: "error" }));
      });
  }, []);

  const translate = useCallback(async (text: string, targetLocale: Locale) => {
    const engine = await import("@/lib/client-translate/engine");
    const unsub = engine.subscribeTranslationLoad((event) => {
      setLoadState({
        status: event.status as LoadState["status"],
        progress: event.progress ?? 0,
      });
    });
    try {
      return await engine.translateTextClientSide(text, targetLocale);
    } finally {
      unsub();
    }
  }, []);

  const value = useMemo(
    () => ({ loadState, warmUp, translate }),
    [loadState, warmUp, translate]
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
