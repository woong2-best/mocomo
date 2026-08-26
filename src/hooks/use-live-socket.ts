"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { fetchSocketAuthToken } from "@/lib/socket-client";
import type { LiveChatMessage } from "@/components/live/live-chat";

export function useLiveSocket(userId: string | undefined, channelId: string | undefined) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    let s: Socket | null = null;
    let cancelled = false;

    (async () => {
      const token = await fetchSocketAuthToken();
      if (cancelled || !token) return;
      s = io(url, { auth: { token }, transports: ["websocket", "polling"] });
      s.on("connect", () => setConnected(true));
      s.on("disconnect", () => setConnected(false));
      setSocket(s);
    })();

    return () => {
      cancelled = true;
      s?.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [userId]);

  useEffect(() => {
    if (!socket || !channelId) return;
    socket.emit("join_live", channelId);
    return () => {
      socket.emit("leave_live", channelId);
    };
  }, [socket, channelId]);

  return { socket, connected };
}

export function relayLiveChatMessage(
  socket: Socket | null,
  channelId: string,
  message: LiveChatMessage
) {
  if (!socket?.connected) return;
  socket.emit("live_chat_relay", { channelId, message });
}

export function subscribeLiveChat(
  socket: Socket | null,
  onMessage: (msg: LiveChatMessage) => void,
  onViewers?: (count: number) => void
) {
  if (!socket) return () => {};
  const onChat = (payload: LiveChatMessage & { channelId?: string }) => {
    if (!payload.id || !payload.username) return;
    onMessage({
      id: payload.id,
      userId: payload.userId,
      username: payload.username,
      content: payload.content,
      at: payload.at,
      image: payload.image,
      supportTierSent: payload.supportTierSent,
    });
  };
  const onViewersEvt = (count: number) => onViewers?.(count);
  socket.on("live_chat_message", onChat);
  socket.on("live_viewers", onViewersEvt);
  return () => {
    socket.off("live_chat_message", onChat);
    socket.off("live_viewers", onViewersEvt);
  };
}

export function subscribeLiveEnded(
  socket: Socket | null,
  channelId: string,
  onEnded: () => void
) {
  if (!socket) return () => {};
  const handler = (payload: { channelId?: string }) => {
    if (payload.channelId === channelId) onEnded();
  };
  socket.on("live_ended", handler);
  return () => {
    socket.off("live_ended", handler);
  };
}
