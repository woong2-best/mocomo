"use client";

import { createContext, useCallback, useContext, useState } from "react";

type SidebarToggleContextValue = {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

const SidebarToggleContext = createContext<SidebarToggleContextValue | null>(null);

export function SidebarToggleProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return (
    <SidebarToggleContext.Provider value={{ open, toggle, setOpen }}>
      {children}
    </SidebarToggleContext.Provider>
  );
}

export function useSidebarToggle() {
  const ctx = useContext(SidebarToggleContext);
  if (!ctx) {
    throw new Error("useSidebarToggle must be used within SidebarToggleProvider");
  }
  return ctx;
}
