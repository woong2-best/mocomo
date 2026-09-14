import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/config/env";
import { fetchMobileSocketAuthToken } from "@/api/calls";
import { getAccessToken } from "@/auth/token-store";
import type { LiveChatMessage } from "@/api/live";

function connectLiveSocket(token: string): Socket {
  return io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
    upgrade: false,
    reconnection: true,
    reconnectionAttempts: 12,
  });
}

/** Real-time MoCoMo live chat (Socket.IO). Falls back to HTTP poll when disconnected. */
export function useMobileLiveChatSocket(
  channelId: string,
  onMessage: (msg: LiveChatMessage) => void
) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!SOCKET_URL || !channelId) return;

    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      const bearer = await getAccessToken();
      if (!bearer || cancelled) return;
      const authRes = await fetchMobileSocketAuthToken().catch(() => null);
      if (!authRes?.token || cancelled) return;

      socket = connectLiveSocket(authRes.token);
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket?.emit("join_live", channelId);
      });
      socket.on("disconnect", () => setConnected(false));

      socket.on("live_chat_message", (payload: LiveChatMessage) => {
        if (!payload?.id || !payload.username) return;
        onMessageRef.current(payload);
      });
    })();

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit("leave_live", channelId);
        socket.disconnect();
      }
      socketRef.current = null;
      setConnected(false);
    };
  }, [channelId]);

  const relayMessage = (message: LiveChatMessage) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    socket.emit("live_chat_relay", { channelId, message });
  };

  return { connected, relayMessage };
}
