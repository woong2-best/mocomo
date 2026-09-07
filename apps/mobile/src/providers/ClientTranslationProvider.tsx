import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Locale } from "@/i18n";
import {
  translateTextOnDevice,
  type ClientTranslateResult,
} from "@/lib/translate/engine";

type ClientTranslationContextValue = {
  translate: (text: string, targetLocale: Locale) => Promise<ClientTranslateResult | null>;
};

const ClientTranslationContext = createContext<ClientTranslationContextValue | null>(null);

export function ClientTranslationProvider({ children }: { children: ReactNode }) {
  const translate = useCallback(
    (text: string, targetLocale: Locale) => translateTextOnDevice(text, targetLocale),
    []
  );

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
