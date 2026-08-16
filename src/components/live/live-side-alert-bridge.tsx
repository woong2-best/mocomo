"use client";

import { useEffect, useRef } from "react";
import { useLiveChat } from "@/components/live/live-chat-provider";
import type { LiveTipAlert } from "@/components/live/live-donation-alert-overlay";

const MAX_CHAT_ALERT_LEN = 120;

/** 라이브 채팅 → 옆 알림 (라이브 페이지 채팅만) */
export function LiveSideAlertBridge({
  onAlert,
}: {
  onAlert: (alert: LiveTipAlert) => void;
}) {
  const { messages } = useLiveChat();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const m of messages) {
      if (seenRef.current.has(m.id)) continue;
      seenRef.current.add(m.id);
      const text = m.content?.trim();
      if (!text || text.length > MAX_CHAT_ALERT_LEN) continue;
      onAlert({
        id: `chat-${m.id}`,
        amount: 0,
        message: text,
        username: m.username,
        at: m.at ?? Date.now(),
        kind: "chat",
      });
    }
  }, [messages, onAlert]);

  return null;
}
