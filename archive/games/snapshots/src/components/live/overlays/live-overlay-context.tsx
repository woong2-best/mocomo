"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLiveOverlays } from "@/hooks/use-live-overlays";

type LiveOverlayContextValue = ReturnType<typeof useLiveOverlays>;

const LiveOverlayContext = createContext<LiveOverlayContextValue | null>(null);

export function LiveOverlayProvider({
  channelId,
  userId,
  hostUserId,
  editable,
  children,
}: {
  channelId: string;
  userId?: string;
  hostUserId?: string;
  editable: boolean;
  children: ReactNode;
}) {
  const value = useLiveOverlays(channelId, userId, hostUserId, editable);
  return <LiveOverlayContext.Provider value={value}>{children}</LiveOverlayContext.Provider>;
}

export function useLiveOverlayContext() {
  const ctx = useContext(LiveOverlayContext);
  if (!ctx) {
    throw new Error("useLiveOverlayContext must be used within LiveOverlayProvider");
  }
  return ctx;
}

export function useLiveOverlayContextOptional() {
  return useContext(LiveOverlayContext);
}
