"use client";

import { useLiveChatOptional } from "@/components/live/live-chat-provider";
import { useLiveSocket } from "@/hooks/use-live-socket";
import { useCallback, useEffect, useState } from "react";

/** 라이브 영상 위 채팅 오버레이 표시 여부 — LiveChatProvider 우선, 없으면 단독 소켓 */
export function useLiveChatOverlay(
  channelId: string,
  userId: string | undefined,
  initialEnabled = true
) {
  const fromProvider = useLiveChatOptional();
  const standalone = !fromProvider;
  const { socket } = useLiveSocket(
    standalone ? userId : undefined,
    standalone ? channelId : undefined
  );
  const [enabled, setEnabled] = useState(initialEnabled);

  useEffect(() => {
    if (!standalone) return;
    setEnabled(initialEnabled);
  }, [initialEnabled, channelId, standalone]);

  useEffect(() => {
    if (!standalone || !socket) return;
    const onState = (data: { channelId?: string; enabled?: boolean }) => {
      if (data.channelId !== channelId || typeof data.enabled !== "boolean") return;
      setEnabled(data.enabled);
    };
    socket.on("live_chat_overlay_state", onState);
    return () => {
      socket.off("live_chat_overlay_state", onState);
    };
  }, [socket, channelId, standalone]);

  const publishOverlay = useCallback(
    (next: boolean) => {
      setEnabled(next);
      if (!socket?.connected) return;
      socket.emit("live_chat_overlay_publish", { channelId, enabled: next });
    },
    [socket, channelId]
  );

  if (fromProvider) {
    return {
      chatOverlayEnabled: fromProvider.chatOverlayEnabled,
      setChatOverlayEnabled: fromProvider.setChatOverlayEnabled,
    };
  }

  return { chatOverlayEnabled: enabled, setChatOverlayEnabled: publishOverlay };
}
