"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { VoiceConnectionState } from "@/lib/community-server/types";

const VoiceCtx = createContext<{
  voice: VoiceConnectionState;
  connect: (state: Omit<VoiceConnectionState, "connected">) => void;
  disconnect: () => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
} | null>(null);

const defaultVoice: VoiceConnectionState = {
  channelId: null,
  channelName: null,
  channelType: null,
  connected: false,
  muted: false,
  deafened: false,
};

export function CommunityVoiceProvider({ children }: { children: ReactNode }) {
  const [voice, setVoice] = useState<VoiceConnectionState>(defaultVoice);

  const connect = useCallback((state: Omit<VoiceConnectionState, "connected">) => {
    setVoice({ ...state, connected: true, muted: false, deafened: false });
  }, []);

  const disconnect = useCallback(() => setVoice(defaultVoice), []);
  const setMuted = useCallback((muted: boolean) => setVoice((v) => ({ ...v, muted })), []);
  const setDeafened = useCallback(
    (deafened: boolean) => setVoice((v) => ({ ...v, deafened, muted: deafened ? true : v.muted })),
    []
  );

  return (
    <VoiceCtx.Provider value={{ voice, connect, disconnect, setMuted, setDeafened }}>
      {children}
    </VoiceCtx.Provider>
  );
}

export function useCommunityVoice() {
  const ctx = useContext(VoiceCtx);
  if (!ctx) throw new Error("useCommunityVoice must be used within CommunityVoiceProvider");
  return ctx;
}
