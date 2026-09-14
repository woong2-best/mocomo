"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LegalComplianceContextValue = {
  isOpen: boolean;
  toggle: () => void;
};

const LegalComplianceContext = createContext<LegalComplianceContextValue | null>(null);

export function LegalComplianceProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => {
          document.getElementById("mocomo-legal-footer")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ isOpen, toggle }), [isOpen, toggle]);

  return (
    <LegalComplianceContext.Provider value={value}>{children}</LegalComplianceContext.Provider>
  );
}

export function useLegalCompliance() {
  const ctx = useContext(LegalComplianceContext);
  if (!ctx) {
    throw new Error("useLegalCompliance must be used within LegalComplianceProvider");
  }
  return ctx;
}
