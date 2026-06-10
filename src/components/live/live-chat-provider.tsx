"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { subscribeLiveChat, useLiveSocket } from "@/hooks/use-live-socket";
import { ensureArray } from "@/lib/ensure-array";
import type { LiveChatMessage } from "@/components/live/live-chat";

type LiveChatContextValue = {
  channelId: string;
  messages: LiveChatMessage[];
  appendMessage: (message: LiveChatMessage) => void;
  replaceOptimistic: (tempId: string, saved: LiveChatMessage) => void;
  removeMessage: (messageId: string) => void;
  socket: Socket | null;
  connected: boolean;
  historyError: string;
  chatOverlayEnabled: boolean;
  setChatOverlayEnabled: (enabled: boolean) => void;
};

const LiveChatContext = createContext<LiveChatContextValue | null>(null);

const MAX_MESSAGES = 150;

export function LiveChatProvider({
  channelId,
  userId,
  onViewerCount,
  chatOverlayInitial = true,
  children,
}: {
  channelId: string;
  userId: string | undefined;
  onViewerCount?: (count: number) => void;
  chatOverlayInitial?: boolean;
  children: ReactNode;
}) {
  const { socket, connected } = useLiveSocket(userId, channelId);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [chatOverlayEnabled, setChatOverlayEnabledState] = useState(chatOverlayInitial);
  const lastSyncRef = useRef<string>(new Date(0).toISOString());

  const mergeMessages = useCallback((incoming: LiveChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const safePrev = ensureArray<LiveChatMessage>(prev);
      const ids = new Set(safePrev.map((m) => m.id));
      const added = incoming.filter((m) => !ids.has(m.id));
      if (added.length === 0) return safePrev;
      return [...safePrev, ...added].slice(-MAX_MESSAGES);
    });
    const last = incoming[incoming.length - 1];
    lastSyncRef.current = new Date(last.at).toISOString();
  }, []);

  const appendMessage = useCallback(
    (message: LiveChatMessage) => {
      mergeMessages([message]);
    },
    [mergeMessages]
  );

  const replaceOptimistic = useCallback((tempId: string, saved: LiveChatMessage) => {
    setMessages((prev) => {
      const without = ensureArray<LiveChatMessage>(prev).filter((m) => m.id !== tempId);
      if (without.some((m) => m.id === saved.id)) return without;
      return [...without, saved].slice(-MAX_MESSAGES);
    });
    lastSyncRef.current = new Date(saved.at).toISOString();
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => ensureArray<LiveChatMessage>(prev).filter((m) => m.id !== messageId));
  }, []);

  useEffect(() => {
    setChatOverlayEnabledState(chatOverlayInitial);
  }, [chatOverlayInitial, channelId]);

  useEffect(() => {
    if (!socket) return;
    const onOverlayState = (data: { channelId?: string; enabled?: boolean }) => {
      if (data.channelId !== channelId || typeof data.enabled !== "boolean") return;
      setChatOverlayEnabledState(data.enabled);
    };
    socket.on("live_chat_overlay_state", onOverlayState);
    return () => {
      socket.off("live_chat_overlay_state", onOverlayState);
    };
  }, [socket, channelId]);

  const setChatOverlayEnabled = useCallback(
    (enabled: boolean) => {
      setChatOverlayEnabledState(enabled);
      if (!socket?.connected) return;
      socket.emit("live_chat_overlay_publish", { channelId, enabled });
    },
    [socket, channelId]
  );

  useEffect(() => {
    let cancelled = false;
    setHistoryError("");
    lastSyncRef.current = new Date(0).toISOString();
    fetch(`/api/live/${channelId}/chat?initial=1`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.json();
        if (!res.ok || !body.ok) {
          setHistoryError("채팅 기록을 불러오지 못했습니다. DB 마이그레이션을 확인해 주세요.");
          return;
        }
        const list = ensureArray<LiveChatMessage>(body.messages);
        setMessages(list.slice(-MAX_MESSAGES));
        if (list.length > 0) {
          lastSyncRef.current = new Date(list[list.length - 1].at).toISOString();
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryError("채팅 기록을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => {
    return subscribeLiveChat(socket, appendMessage, onViewerCount);
  }, [socket, appendMessage, onViewerCount]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live/${channelId}/chat?since=${encodeURIComponent(lastSyncRef.current)}`,
        { credentials: "include", cache: "no-store" }
      );
      const body = await res.json();
      if (!res.ok || !body.ok) return;
      if (typeof body.viewerCount === "number") {
        onViewerCount?.(body.viewerCount);
      }
      mergeMessages(ensureArray<LiveChatMessage>(body.messages));
    } catch {
      /* ignore */
    }
  }, [channelId, mergeMessages, onViewerCount]);

  useEffect(() => {
    void poll();
    const ms = connected ? 3000 : 2000;
    const id = setInterval(poll, ms);
    return () => clearInterval(id);
  }, [poll, connected]);

  const value = useMemo<LiveChatContextValue>(
    () => ({
      channelId,
      messages,
      appendMessage,
      replaceOptimistic,
      removeMessage,
      socket,
      connected,
      historyError,
      chatOverlayEnabled,
      setChatOverlayEnabled,
    }),
    [
      channelId,
      messages,
      appendMessage,
      replaceOptimistic,
      removeMessage,
      socket,
      connected,
      historyError,
      chatOverlayEnabled,
      setChatOverlayEnabled,
    ]
  );

  return <LiveChatContext.Provider value={value}>{children}</LiveChatContext.Provider>;
}

export function useLiveChat() {
  const ctx = useContext(LiveChatContext);
  if (!ctx) {
    throw new Error("useLiveChat must be used within LiveChatProvider");
  }
  return ctx;
}

export function useLiveChatOptional() {
  return useContext(LiveChatContext);
}
