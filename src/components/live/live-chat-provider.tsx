"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
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
import { ensureArray, ensureStringArray } from "@/lib/ensure-array";
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
  const { t } = useLocale();
  const { socket, connected } = useLiveSocket(userId, channelId);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [chatOverlayEnabled, setChatOverlayEnabledState] = useState(chatOverlayInitial);
  const lastSyncRef = useRef<string>("");
  const initialOkRef = useRef(false);

  const mergeMessages = useCallback((incoming: LiveChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const map = new Map(ensureArray<LiveChatMessage>(prev).map((m) => [m.id, m]));
      for (const m of incoming) {
        const existing = map.get(m.id);
        map.set(m.id, existing ? { ...existing, ...m } : m);
      }
      return [...map.values()]
        .sort((a, b) => a.at - b.at)
        .slice(-MAX_MESSAGES);
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
    let attempt = 0;
    setHistoryError("");
    lastSyncRef.current = "";
    initialOkRef.current = false;

    async function loadInitial() {
      try {
        const res = await fetch(`/api/live/${channelId}/chat?initial=1`, {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        const body = await res.json().catch(() => ({}));
        if (res.status === 403 && attempt < 4) {
          attempt += 1;
          window.setTimeout(() => {
            if (!cancelled) void loadInitial();
          }, 400 * attempt);
          return;
        }
        if (!res.ok || !body.ok) {
          setHistoryError(t("live.s9lciv9"));
          return;
        }
        const list = ensureArray<LiveChatMessage>(body.messages);
        setMessages(list.slice(-MAX_MESSAGES));
        lastSyncRef.current =
          list.length > 0 ? new Date(list[list.length - 1]!.at).toISOString() : new Date().toISOString();
        initialOkRef.current = true;
        setHistoryError("");
      } catch {
        if (!cancelled) setHistoryError(t("live.sp4bxvm"));
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  useEffect(() => {
    return subscribeLiveChat(socket, appendMessage, onViewerCount, removeMessage);
  }, [socket, appendMessage, onViewerCount, removeMessage]);

  const poll = useCallback(async () => {
    if (!initialOkRef.current || !lastSyncRef.current) return;
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
      const deletedIds = ensureStringArray(body.deletedIds);
      if (deletedIds.length) {
        setMessages((prev) =>
          ensureArray<LiveChatMessage>(prev).filter((m) => !deletedIds.includes(m.id))
        );
      }
      mergeMessages(ensureArray<LiveChatMessage>(body.messages));
    } catch {
      /* ignore */
    }
  }, [channelId, mergeMessages, onViewerCount]);

  useEffect(() => {
    void poll();
    const ms = connected ? 12_000 : 1_500;
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
