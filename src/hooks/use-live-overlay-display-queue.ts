"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveChatMessage } from "@/components/live/live-chat";
import {
  LIVE_CHAT_BURST_COOLDOWN_SEC,
  LIVE_CHAT_BURST_SIZE,
} from "@/lib/live-chat-burst-limit";

const REVEAL_INTERVAL_MS = 700;

/** 방송 화면 — 연속 5개 빠르게 노출, 이후 5초 대기 */
export function useLiveOverlayDisplayQueue(allMessages: LiveChatMessage[]) {
  const [onScreen, setOnScreen] = useState<LiveChatMessage[]>([]);
  const processedIds = useRef(new Set<string>());
  const pendingRef = useRef<LiveChatMessage[]>([]);
  const burstCountRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (allMessages.length === 0) return;

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const initial = allMessages.slice(-LIVE_CHAT_BURST_SIZE);
      initial.forEach((m) => processedIds.current.add(m.id));
      setOnScreen(initial);
      return;
    }

    for (const m of allMessages) {
      if (processedIds.current.has(m.id)) continue;
      if (pendingRef.current.some((p) => p.id === m.id)) continue;
      pendingRef.current.push(m);
    }
  }, [allMessages]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (now < cooldownUntilRef.current) return;

      if (burstCountRef.current >= LIVE_CHAT_BURST_SIZE) {
        cooldownUntilRef.current = now + LIVE_CHAT_BURST_COOLDOWN_SEC * 1000;
        burstCountRef.current = 0;
        return;
      }

      const next = pendingRef.current.shift();
      if (!next) return;

      processedIds.current.add(next.id);
      burstCountRef.current += 1;
      setOnScreen((prev) => [...prev, next].slice(-LIVE_CHAT_BURST_SIZE));
    };

    const id = window.setInterval(tick, REVEAL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return onScreen;
}
