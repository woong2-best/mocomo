"use client";

import { createContext, useContext } from "react";
import type { WikiLinkStatusMap } from "@/lib/wiki/resolve-links";

const WikiLinkStatusContext = createContext<WikiLinkStatusMap | null>(null);

export function WikiLinkStatusProvider({
  value,
  children,
}: {
  value: WikiLinkStatusMap | null | undefined;
  children: React.ReactNode;
}) {
  return <WikiLinkStatusContext.Provider value={value ?? null}>{children}</WikiLinkStatusContext.Provider>;
}

export function useWikiLinkStatus(): WikiLinkStatusMap | null {
  return useContext(WikiLinkStatusContext);
}
