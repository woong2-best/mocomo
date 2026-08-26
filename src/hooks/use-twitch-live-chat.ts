"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlatformChatMessage } from "@/lib/live-external/platform-chat/types";
import { parseTwitchIrcPrivmsg } from "@/lib/live-external/platform-chat/twitch-irc";

const TWITCH_WS = "wss://irc-ws.chat.twitch.tv:443";
const MAX_PLATFORM_MESSAGES = 150;

/** Read-only Twitch IRC over WebSocket (anonymous justinfan — public channels). */
export function useTwitchLiveChat(channelLogin: string | null, enabled: boolean) {
  const [messages, setMessages] = useState<PlatformChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((msg: PlatformChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg].slice(-MAX_PLATFORM_MESSAGES);
    });
  }, []);

  useEffect(() => {
    if (!enabled || !channelLogin?.trim()) {
      setMessages([]);
      setConnected(false);
      return;
    }

    const login = channelLogin.trim().toLowerCase();
    let cancelled = false;
    let ws: WebSocket | null = null;

    function scheduleReconnect() {
      if (cancelled) return;
      setConnected(false);
      const attempt = reconnectAttemptRef.current++;
      const delay = Math.min(30_000, 2_000 * 2 ** attempt);
      reconnectTimerRef.current = setTimeout(() => {
        if (!cancelled) connect();
      }, delay);
    }

    function connect() {
      if (cancelled) return;
      try {
        ws = new WebSocket(TWITCH_WS);

        ws.onopen = () => {
          if (cancelled || !ws) return;
          const nick = `justinfan${Math.floor(Math.random() * 999_999)}`;
          ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands\r\n");
          ws.send("PASS SCHMOOPIIE\r\n");
          ws.send(`NICK ${nick}\r\n`);
          ws.send(`JOIN #${login}\r\n`);
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          const payload = String(event.data);
          for (const line of payload.split("\r\n")) {
            if (!line) continue;
            if (line.startsWith("PING")) {
              ws?.send(line.replace("PING", "PONG") + "\r\n");
              continue;
            }
            if (line.includes(` 366 ${login} #${login}`) || line.includes(` JOIN #${login}`)) {
              reconnectAttemptRef.current = 0;
              setConnected(true);
            }
            const msg = parseTwitchIrcPrivmsg(line, login);
            if (msg) {
              setConnected(true);
              push(msg);
            }
          }
        };

        ws.onclose = () => {
          if (!cancelled) scheduleReconnect();
        };

        ws.onerror = () => {
          setConnected(false);
        };
      } catch {
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      cancelled = true;
      setConnected(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      ws?.close();
    };
  }, [channelLogin, enabled, push]);

  return { messages, connected };
}
