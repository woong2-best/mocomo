"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlatformChatMessage } from "@/lib/live-external/platform-chat/types";
import { platformUserId } from "@/lib/live-external/platform-chat/types";
import {
  sanitizePlatformChatText,
  sanitizePlatformChatUsername,
} from "@/lib/live-external/platform-chat/sanitize";

const MAX_PLATFORM_MESSAGES = 150;

const ChatCmd = {
  PING: 0,
  PONG: 10000,
  CONNECT: 100,
  CONNECTED: 10100,
  REQUEST_RECENT_CHAT: 5101,
  RECENT_CHAT: 15101,
  CHAT: 93101,
  DONATION: 93102,
} as const;

const ChatType = {
  TEXT: 1,
  DONATION: 10,
} as const;

type ChzzkSession = {
  chatChannelId: string;
  accessToken: string;
  wsServerId: number;
};

function extractChatItems(body: unknown): Record<string, unknown>[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.messageList)) {
    return record.messageList.filter((item) => item && typeof item === "object") as Record<
      string,
      unknown
    >[];
  }
  if (record.profile && (record.msg || record.content)) {
    return [record];
  }
  return [];
}

function parseChzzkChatItem(item: Record<string, unknown>): PlatformChatMessage | null {
  const type = item.msgTypeCode ?? item.messageTypeCode;
  const isText = type === ChatType.TEXT || type === "TEXT" || type === 1;
  const isDonation = type === ChatType.DONATION || type === "DONATION" || type === 10;
  if (!isText && !isDonation) return null;

  const profileRaw = item.profile;
  if (typeof profileRaw !== "string") return null;

  let profile: { nickname?: string; profileImageUrl?: string; userIdHash?: string };
  try {
    profile = JSON.parse(profileRaw) as typeof profile;
  } catch {
    return null;
  }

  const username = sanitizePlatformChatUsername(profile.nickname?.trim() ?? "");
  let content = sanitizePlatformChatText(String(item.msg ?? item.content ?? "").trim());
  if (!username || !content) return null;
  if (isDonation) content = `[후원] ${content}`;

  const at = Number(item.msgTime ?? item.messageTime ?? Date.now());
  const messageId = item.msgId ?? item.messageId;
  const id =
    typeof messageId === "string" || typeof messageId === "number"
      ? `chzzk:${messageId}`
      : `chzzk:${at}:${profile.userIdHash ?? username}:${content.slice(0, 24)}`;

  return {
    id,
    source: "CHZZK",
    username,
    content,
    at,
    image: profile.profileImageUrl ?? null,
    userId: platformUserId("CHZZK", profile.userIdHash ?? username),
  };
}

/** Read-only Chzzk live chat over JSON WebSocket (anonymous READ auth). */
export function useChzzkLiveChat(
  channelKey: string | null,
  enabled: boolean,
  options?: { sessionUrl?: (channelKey: string) => string }
) {
  const [messages, setMessages] = useState<PlatformChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const push = useCallback((msg: PlatformChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg].slice(-MAX_PLATFORM_MESSAGES);
    });
  }, []);

  useEffect(() => {
    if (!enabled || !channelKey?.trim()) {
      setMessages([]);
      setConnected(false);
      return;
    }

    let cancelled = false;
    let ws: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPingTimer() {
      if (pingTimer) clearTimeout(pingTimer);
      pingTimer = null;
    }

    function schedulePing() {
      clearPingTimer();
      pingTimer = setTimeout(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ cmd: ChatCmd.PING, ver: "2" }));
          schedulePing();
        }
      }, 20_000);
    }

    function scheduleReconnect() {
      if (cancelled) return;
      setConnected(false);
      const attempt = reconnectAttemptRef.current++;
      const delay = Math.min(30_000, 2_000 * 2 ** attempt);
      reconnectTimerRef.current = setTimeout(() => {
        if (!cancelled) void connect();
      }, delay);
    }

    async function fetchSession(): Promise<ChzzkSession | null> {
      try {
        const url =
          options?.sessionUrl?.(channelKey.trim()) ??
          `/api/live/${encodeURIComponent(channelKey.trim())}/platform-chat?kind=session`;
        const res = await fetch(url, { credentials: "include", cache: "no-store" });
        if (res.status === 410) return null;
        if (!res.ok) return null;
        const body = (await res.json()) as {
          ok?: boolean;
          session?: ChzzkSession | null;
        };
        return body.ok ? (body.session ?? null) : null;
      } catch {
        return null;
      }
    }

    async function connect() {
      if (cancelled) return;

      const session = await fetchSession();
      if (!session || cancelled) {
        scheduleReconnect();
        return;
      }

      reconnectAttemptRef.current = 0;
      const defaults = {
        cid: session.chatChannelId,
        svcid: "game",
        ver: "2",
      };

      try {
        ws = new WebSocket(
          `wss://kr-ss${session.wsServerId}.chat.naver.com/chat`
        );
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled || !ws) return;
          ws.send(
            JSON.stringify({
              bdy: {
                accTkn: session.accessToken,
                auth: "READ",
                devType: 2001,
                uid: null,
              },
              cmd: ChatCmd.CONNECT,
              tid: 1,
              ...defaults,
            })
          );
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          let json: { cmd?: number; bdy?: unknown; sid?: string };
          try {
            json = JSON.parse(String(event.data)) as typeof json;
          } catch {
            return;
          }

          if (json.cmd === ChatCmd.CONNECTED) {
            setConnected(true);
            const sid =
              json.bdy && typeof json.bdy === "object"
                ? (json.bdy as { sid?: string }).sid
                : undefined;
            if (sid && ws?.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  bdy: { recentMessageCount: 40 },
                  cmd: ChatCmd.REQUEST_RECENT_CHAT,
                  sid,
                  tid: 2,
                  ...defaults,
                })
              );
            }
            schedulePing();
            return;
          }

          if (json.cmd === ChatCmd.PING) {
            ws?.send(JSON.stringify({ cmd: ChatCmd.PONG, ver: "2" }));
            return;
          }

          if (
            json.cmd === ChatCmd.CHAT ||
            json.cmd === ChatCmd.RECENT_CHAT ||
            json.cmd === ChatCmd.DONATION
          ) {
            for (const item of extractChatItems(json.bdy)) {
              const parsed = parseChzzkChatItem(item);
              if (parsed) push(parsed);
            }
          }
        };

        ws.onclose = () => {
          clearPingTimer();
          if (!cancelled) scheduleReconnect();
        };

        ws.onerror = () => {
          setConnected(false);
        };
      } catch {
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      cancelled = true;
      setConnected(false);
      clearPingTimer();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      ws?.close();
      wsRef.current = null;
    };
  }, [channelKey, enabled, push, options?.sessionUrl]);

  return { messages, connected };
}
