"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type InsertHandler = () => void;

type WalletPayContextValue = {
  registerInsertHandler: (handler: InsertHandler | null) => void;
  notifyCardInserted: () => void;
};

const WalletPayContext = createContext<WalletPayContextValue | null>(null);

export function WalletPayProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<InsertHandler | null>(null);

  const registerInsertHandler = useCallback((handler: InsertHandler | null) => {
    handlerRef.current = handler;
  }, []);

  const notifyCardInserted = useCallback(() => {
    handlerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ registerInsertHandler, notifyCardInserted }),
    [registerInsertHandler, notifyCardInserted],
  );

  return <WalletPayContext.Provider value={value}>{children}</WalletPayContext.Provider>;
}

export function useWalletPay() {
  const ctx = useContext(WalletPayContext);
  if (!ctx) throw new Error("useWalletPay must be used within WalletPayProvider");
  return ctx;
}
