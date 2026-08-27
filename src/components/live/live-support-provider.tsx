"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { LiveTipAlert } from "@/components/live/live-donation-alert-overlay";
import { LiveSupportBridge } from "@/components/live/live-support-bridge";
import { useLiveChat } from "@/components/live/live-chat-provider";
import { useSupportChatHandlers } from "@/components/live/live-support-chat-bridge";
import type { LiveSupportMissionPayload, LiveSupportPollPayload } from "@/lib/live-support/types";
import type { Socket } from "socket.io-client";

type LiveSupportContextValue = {
  socket: Socket | null;
  connected: boolean;
  missions: LiveSupportMissionPayload[];
  poll: LiveSupportPollPayload | null;
  upsertMission: (m: LiveSupportMissionPayload) => void;
  setPoll: (p: LiveSupportPollPayload | null) => void;
  pushAlert: (a: LiveTipAlert) => void;
};

const LiveSupportContext = createContext<LiveSupportContextValue | null>(null);

export function LiveSupportProvider({
  channelId,
  isHost,
  onAlert,
  feedChat = false,
  children,
}: {
  channelId: string;
  isHost: boolean;
  onAlert: (alert: LiveTipAlert) => void;
  /** 후원·룰렛·미션을 채팅 피드에도 표시 (외부 라이브 OBS 대체) */
  feedChat?: boolean;
  children: ReactNode;
}) {
  const { socket, connected } = useLiveChat();
  const { data: session } = useSession();
  const [missions, setMissions] = useState<LiveSupportMissionPayload[]>([]);
  const [poll, setPoll] = useState<LiveSupportPollPayload | null>(null);
  const chatHandlers = useSupportChatHandlers();

  const upsertMission = useCallback((m: LiveSupportMissionPayload) => {
    setMissions((prev) => {
      const idx = prev.findIndex((x) => x.id === m.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = m;
        return next;
      }
      return [m, ...prev].slice(0, 30);
    });
  }, []);

  const pushAlert = useCallback(
    (alert: LiveTipAlert) => {
      onAlert(alert);
      if (feedChat) chatHandlers.onAlert(alert);
    },
    [onAlert, feedChat, chatHandlers]
  );

  const handleMission = useCallback(
    (m: LiveSupportMissionPayload) => {
      upsertMission(m);
      if (feedChat) chatHandlers.onMission(m);
    },
    [upsertMission, feedChat, chatHandlers]
  );

  const value: LiveSupportContextValue = {
    socket,
    connected,
    missions,
    poll,
    upsertMission,
    setPoll,
    pushAlert,
  };

  void channelId;
  void session;

  return (
    <LiveSupportContext.Provider value={value}>
      <LiveSupportBridge
        socket={socket}
        isHost={isHost}
        onAlert={pushAlert}
        onMission={handleMission}
        onPoll={setPoll}
      />
      {children}
    </LiveSupportContext.Provider>
  );
}

export function useLiveSupport() {
  const ctx = useContext(LiveSupportContext);
  if (!ctx) throw new Error("useLiveSupport must be used within LiveSupportProvider");
  return ctx;
}
