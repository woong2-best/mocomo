"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLiveChat } from "@/components/live/live-chat-provider";
import type { LiveTipAlert } from "@/components/live/live-donation-alert-overlay";
import type { LiveSupportMissionPayload } from "@/lib/live-support/types";
import {
  cheerEventToChatMessage,
  missionToChatMessage,
  tipToChatMessage,
} from "@/lib/live-support/support-to-chat";

/** 유료 후원 폴링 (소켓 미수신 tip 보완) */
export function LiveSupportTipPoll({ channelId }: { channelId: string }) {
  const { appendMessage } = useLiveChat();
  const seenRef = useRef<Set<string>>(new Set());
  const sinceRef = useRef(Date.now() - 60_000);

  const pushLine = useCallback(
    (id: string, message: Parameters<typeof appendMessage>[0]) => {
      if (seenRef.current.has(id)) return;
      seenRef.current.add(id);
      appendMessage(message);
    },
    [appendMessage]
  );

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/live/${channelId}/stats?since=${encodeURIComponent(String(sinceRef.current))}`,
          { credentials: "include", cache: "no-store" }
        );
        if (!res.ok) return;
        const body = (await res.json()) as {
          recentTips?: Array<{
            id: string;
            amount: number;
            message: string | null;
            username: string;
            at: number;
            kind?: string;
            eventType?: string;
            rouletteLabel?: string;
          }>;
          serverTime?: number;
        };
        if (cancelled) return;
        for (const t of body.recentTips ?? []) {
          if (t.kind === "cheer") {
            pushLine(
              `support-${t.id}`,
              cheerEventToChatMessage({
                id: t.id,
                username: t.username,
                amount: t.amount,
                message: t.message,
                type: t.eventType ?? "GENERAL",
                metadata: t.rouletteLabel ? { rouletteLabel: t.rouletteLabel } : null,
                at: t.at,
              })
            );
          } else {
            pushLine(
              `tip-${t.id}`,
              tipToChatMessage({
                id: t.id,
                username: t.username,
                amount: t.amount,
                message: t.message,
                at: t.at,
              })
            );
          }
        }
        if (typeof body.serverTime === "number") {
          sinceRef.current = body.serverTime - 5_000;
        }
      } catch {
        /* ignore */
      }
    }

    void tick();
    const id = setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId, pushLine]);

  return null;
}

/** LiveSupportProvider feedChat용 — alert/mission → 채팅 라인 */
export function useSupportChatHandlers() {
  const { appendMessage } = useLiveChat();
  const seenRef = useRef<Set<string>>(new Set());
  const missionStatusRef = useRef<Map<string, string>>(new Map());

  const pushLine = useCallback(
    (id: string, message: Parameters<typeof appendMessage>[0]) => {
      if (seenRef.current.has(id)) return;
      seenRef.current.add(id);
      appendMessage(message);
    },
    [appendMessage]
  );

  const onAlert = useCallback(
    (alert: LiveTipAlert) => {
      if (alert.kind === "chat") return;
      if (alert.kind === "cheer") {
        pushLine(
          `support-${alert.id}`,
          cheerEventToChatMessage({
            id: alert.id,
            username: alert.username,
            amount: alert.amount,
            message: alert.message,
            type: alert.eventType ?? "GENERAL",
            metadata: alert.rouletteLabel ? { rouletteLabel: alert.rouletteLabel } : null,
            at: alert.at,
          })
        );
        return;
      }
      if (alert.kind === "tip" || (!alert.kind && alert.amount > 0)) {
        pushLine(
          `tip-${alert.id}`,
          tipToChatMessage({
            id: alert.id,
            username: alert.username,
            amount: alert.amount,
            message: alert.message,
            at: alert.at,
          })
        );
      }
    },
    [pushLine]
  );

  const onMission = useCallback(
    (m: LiveSupportMissionPayload) => {
      const prev = missionStatusRef.current.get(m.id);
      if (prev === m.status) return;
      missionStatusRef.current.set(m.id, m.status);
      pushLine(
        `mission-${m.id}-${m.status}`,
        missionToChatMessage({
          id: m.id,
          username: m.username,
          title: m.title,
          rewardAmount: m.rewardAmount,
          status: m.status,
          at: m.at ?? Date.now(),
        })
      );
    },
    [pushLine]
  );

  return { onAlert, onMission };
}
