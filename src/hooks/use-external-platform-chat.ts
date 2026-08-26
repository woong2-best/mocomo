"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import type { PlatformChatMessage } from "@/lib/live-external/platform-chat/types";
import { useTwitchLiveChat } from "@/hooks/use-twitch-live-chat";
import { useChzzkLiveChat } from "@/hooks/use-chzzk-live-chat";

const MAX_PLATFORM_MESSAGES = 150;

type PollState = {
  pageToken: string | null;
  liveChatId: string | null;
  intervalMs: number;
};

/** Merge platform-native chat (Twitch WS + YouTube poll) for external live rooms. */
export function useExternalPlatformChat(params: {
  enabled: boolean;
  provider: LiveExternalProvider | null | undefined;
  externalId: string | null | undefined;
  channelId: string;
}) {
  const { enabled, provider, externalId, channelId } = params;
  const active = enabled && !!provider && !!externalId;

  const twitch = useTwitchLiveChat(
    provider === "TWITCH" ? externalId ?? null : null,
    active && provider === "TWITCH"
  );

  const chzzk = useChzzkLiveChat(
    channelId,
    active && provider === "CHZZK"
  );

  const [polled, setPolled] = useState<PlatformChatMessage[]>([]);
  const [youtubeReady, setYoutubeReady] = useState(false);
  const pollRef = useRef<PollState>({
    pageToken: null,
    liveChatId: null,
    intervalMs: 5000,
  });

  useEffect(() => {
    if (!active || provider !== "YOUTUBE") {
      setPolled([]);
      setYoutubeReady(false);
      pollRef.current = { pageToken: null, liveChatId: null, intervalMs: 5000 };
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      try {
        const q = new URLSearchParams();
        if (pollRef.current.pageToken) {
          q.set("pageToken", pollRef.current.pageToken);
        }
        if (pollRef.current.liveChatId) {
          q.set("liveChatId", pollRef.current.liveChatId);
        }
        const res = await fetch(
          `/api/live/${channelId}/platform-chat?${q.toString()}`,
          { credentials: "include", cache: "no-store" }
        );
        if (res.status === 410 || cancelled) {
          setPolled([]);
          pollRef.current = { pageToken: null, liveChatId: null, intervalMs: 5000 };
          return;
        }
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          ok?: boolean;
          messages?: PlatformChatMessage[];
          nextPageToken?: string | null;
          liveChatId?: string | null;
          pollingIntervalMs?: number;
        };
        if (!body.ok || cancelled) return;

        if (body.liveChatId) {
          pollRef.current.liveChatId = body.liveChatId;
          setYoutubeReady(true);
        }
        if (body.nextPageToken) pollRef.current.pageToken = body.nextPageToken;
        if (body.pollingIntervalMs) pollRef.current.intervalMs = body.pollingIntervalMs;

        if (body.messages?.length) {
          setPolled((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const m of body.messages!) map.set(m.id, m);
            return [...map.values()]
              .sort((a, b) => a.at - b.at)
              .slice(-MAX_PLATFORM_MESSAGES);
          });
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        timer = setTimeout(() => void tick(), pollRef.current.intervalMs);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, provider, externalId, channelId]);

  if (!active) {
    return { messages: [] as PlatformChatMessage[], platformConnected: false };
  }

  if (provider === "TWITCH") {
    return { messages: twitch.messages, platformConnected: twitch.connected };
  }

  if (provider === "YOUTUBE") {
    return {
      messages: polled,
      platformConnected: polled.length > 0 || youtubeReady,
    };
  }

  if (provider === "CHZZK") {
    return { messages: chzzk.messages, platformConnected: chzzk.connected };
  }

  return { messages: [] as PlatformChatMessage[], platformConnected: false };
}
