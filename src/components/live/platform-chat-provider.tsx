"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useExternalPlatformChat } from "@/hooks/use-external-platform-chat";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import type { PlatformChatMessage } from "@/lib/live-external/platform-chat/types";

export type PlatformChatContextValue = {
  messages: PlatformChatMessage[];
  platformConnected: boolean;
};

const PlatformChatContext = createContext<PlatformChatContextValue | null>(null);

/** Single platform chat connection shared by chat UI + host dashboard. */
export function PlatformChatProvider({
  children,
  channelId,
  provider,
  externalId,
  enabled,
}: {
  children: ReactNode;
  channelId: string;
  provider: LiveExternalProvider;
  externalId: string;
  enabled?: boolean;
}) {
  const state = useExternalPlatformChat({
    enabled: enabled !== false,
    provider,
    externalId,
    channelId,
  });

  return (
    <PlatformChatContext.Provider value={state}>{children}</PlatformChatContext.Provider>
  );
}

export function usePlatformChat(): PlatformChatContextValue {
  return (
    useContext(PlatformChatContext) ?? {
      messages: [],
      platformConnected: false,
    }
  );
}

export function usePlatformChatOptional(): PlatformChatContextValue | null {
  return useContext(PlatformChatContext);
}
