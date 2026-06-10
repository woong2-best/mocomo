"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeLiveChat, useLiveSocket } from "@/hooks/use-live-socket";
import { ensureArray } from "@/lib/ensure-array";
import type { LiveChatMessage } from "@/components/live/live-chat";

/** 라이브 채팅 — 초기 로드 + 소켓 + 폴링 (사이드바·오버레이 공통) */
export function useLiveChatMessages(
  channelId: string,
  userId: string | undefined,
  maxKeep = 150
) {
  const { socket, connected } = useLiveSocket(userId, channelId);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const lastSyncRef = useRef<string>(new Date(0).toISOString());

  const mergeMessages = useCallback(
    (incoming: LiveChatMessage[]) => {
      if (incoming.length === 0) return;
      setMessages((prev) => {
        const safePrev = ensureArray<LiveChatMessage>(prev);
        const ids = new Set(safePrev.map((m) => m.id));
        const added = incoming.filter((m) => !ids.has(m.id));
        if (added.length === 0) return safePrev;
        return [...safePrev, ...added].slice(-maxKeep);
      });
      const last = incoming[incoming.length - 1];
      lastSyncRef.current = new Date(last.at).toISOString();
    },
    [maxKeep]
  );

  const appendMessage = useCallback(
    (m: LiveChatMessage) => {
      mergeMessages([m]);
    },
    [mergeMessages]
  );

  useEffect(() => {
    let cancelled = false;
    lastSyncRef.current = new Date(0).toISOString();
    fetch(`/api/live/${channelId}/chat?initial=1`, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.json();
        if (!res.ok || !body.ok) return;
        const list = ensureArray<LiveChatMessage>(body.messages);
        setMessages(list.slice(-maxKeep));
        if (list.length > 0) {
          lastSyncRef.current = new Date(list[list.length - 1].at).toISOString();
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [channelId, maxKeep]);

  useEffect(() => subscribeLiveChat(socket, appendMessage), [socket, appendMessage]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/live/${channelId}/chat?since=${encodeURIComponent(lastSyncRef.current)}`,
        { credentials: "include", cache: "no-store" }
      );
      const body = await res.json();
      if (!res.ok || !body.ok) return;
      mergeMessages(ensureArray<LiveChatMessage>(body.messages));
    } catch {
      /* ignore */
    }
  }, [channelId, mergeMessages]);

  useEffect(() => {
    void poll();
    const ms = connected ? 3000 : 2000;
    const id = setInterval(poll, ms);
    return () => clearInterval(id);
  }, [poll, connected]);

  return { messages, socket, connected, appendMessage };
}
