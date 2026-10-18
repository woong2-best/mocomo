import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Locale } from "@/i18n";

type ClientTranslateResult = {
  translated: string;
  sourceLang: Locale | null;
};

type ClientTranslationContextValue = {
  translate: (text: string, targetLocale: Locale) => Promise<ClientTranslateResult | null>;
};

const ClientTranslationContext = createContext<ClientTranslationContextValue | null>(null);

export function ClientTranslationProvider({ children }: { children: ReactNode }) {
  const translate = useCallback(async (text: string, targetLocale: Locale) => {
    try {
      const { apiRequest } = await import("@/api/client");
      const res = await apiRequest<{
        ok?: boolean;
        translated?: string;
        sourceLang?: string | null;
      }>("/api/translate", {
        method: "POST",
        body: { text, targetLocale: targetLocale.split("-")[0] },
        auth: false,
      });
      if (res.translated && res.translated !== text) {
        return {
          translated: res.translated,
          sourceLang: (res.sourceLang as Locale | null) ?? null,
        };
      }
    } catch {
      /* fall through to on-device */
    }
    try {
      const { translateTextOnDevice } = await import("@/lib/translate/engine");
      return await translateTextOnDevice(text, targetLocale);
    } catch {
      return null;
    }
  }, []);

  const value = useMemo(() => ({ translate }), [translate]);

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
