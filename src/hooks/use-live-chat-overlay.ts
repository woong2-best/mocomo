"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveSocket } from "@/hooks/use-live-socket";

/** 라이브 영상 위 채팅 오버레이 표시 여부 — 호스트가 토글, 시청자 동기화 */
export function useLiveChatOverlay(
  channelId: string,
  userId: string | undefined,
  initialEnabled = true
) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const { socket } = useLiveSocket(userId, channelId);

  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled, channelId]);

  useEffect(() => {
    if (!socket) return;
    const onState = (data: { channelId?: string; enabled?: boolean }) => {
      if (data.channelId !== channelId || typeof data.enabled !== "boolean") return;
      setEnabled(data.enabled);
    };
    socket.on("live_chat_overlay_state", onState);
    return () => {
      socket.off("live_chat_overlay_state", onState);
    };
  }, [socket, channelId]);

  const publishOverlay = useCallback(
    (next: boolean) => {
      setEnabled(next);
      if (!socket?.connected) return;
      socket.emit("live_chat_overlay_publish", { channelId, enabled: next });
    },
    [socket, channelId]
  );

  return { chatOverlayEnabled: enabled, setChatOverlayEnabled: publishOverlay };
}
