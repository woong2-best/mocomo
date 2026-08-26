"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import type { PlatformChatMessage } from "@/lib/live-external/platform-chat/types";
import {
  mergeUnifiedChatMessages,
  platformToUnified,
  type UnifiedChatMessage,
} from "@/lib/live-external/platform-chat/merge-messages";
import { useTwitchLiveChat } from "@/hooks/use-twitch-live-chat";
import { useChzzkLiveChat } from "@/hooks/use-chzzk-live-chat";

const MAX_PLATFORM_MESSAGES = 150;

type OverlayMeta = {
  provider: LiveExternalProvider;
  externalId?: string;
};

type MocomoOverlayMsg = {
  id: string;
  username: string;
  content: string;
  at: string;
};

/** Unified MoCoMo + platform chat for OBS browser source (token auth). */
export function useOverlayUnifiedChat(channelId: string, token: string) {
  const [mocomoMessages, setMocomoMessages] = useState<UnifiedChatMessage[]>([]);
  const [meta, setMeta] = useState<OverlayMeta | null>(null);
  const sinceRef = useRef(new Date(Date.now() - 60_000).toISOString());

  const [streamEnded, setStreamEnded] = useState(false);

  const twitch = useTwitchLiveChat(
    meta?.provider === "TWITCH" ? meta.externalId ?? null : null,
    meta?.provider === "TWITCH" && !streamEnded
  );

  const chzzkSessionUrl = useCallback(
    (id: string) =>
      `/api/overlay/${encodeURIComponent(id)}/platform-chat?token=${encodeURIComponent(token)}&kind=session`,
    [token]
  );

  const chzzk = useChzzkLiveChat(channelId, meta?.provider === "CHZZK" && !streamEnded, {
    sessionUrl: chzzkSessionUrl,
  });

  const [youtubeMessages, setYoutubeMessages] = useState<PlatformChatMessage[]>([]);
  const youtubePollRef = useRef({
    pageToken: null as string | null,
    liveChatId: null as string | null,
    intervalMs: 5000,
  });

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const q = new URLSearchParams({ token, since: sinceRef.current });
        const res = await fetch(`/api/overlay/${channelId}/chat?${q}`);
        if (res.status === 410) {
          setStreamEnded(true);
          return;
        }
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          messages?: MocomoOverlayMsg[];
          meta?: OverlayMeta | null;
        };
        if (data.meta) setMeta(data.meta);
        if (!data.messages?.length || cancelled) return;

        setMocomoMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of data.messages!) {
            map.set(m.id, {
              id: m.id,
              username: m.username,
              content: m.content,
              at: new Date(m.at).getTime(),
              source: "MOCOMO",
            });
          }
          const next = [...map.values()].slice(-MAX_PLATFORM_MESSAGES);
          const last = data.messages![data.messages!.length - 1];
          if (last) sinceRef.current = last.at;
          return next;
        });
      } catch {
        /* ignore */
      }
    }

    void tick();
    const id = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId, token]);

  useEffect(() => {
    if (meta?.provider !== "YOUTUBE" || streamEnded) {
      setYoutubeMessages([]);
      youtubePollRef.current = { pageToken: null, liveChatId: null, intervalMs: 5000 };
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      try {
        const q = new URLSearchParams({ token });
        if (youtubePollRef.current.pageToken) {
          q.set("pageToken", youtubePollRef.current.pageToken);
        }
        if (youtubePollRef.current.liveChatId) {
          q.set("liveChatId", youtubePollRef.current.liveChatId);
        }
        const res = await fetch(
          `/api/overlay/${channelId}/platform-chat?${q.toString()}`,
          { cache: "no-store" }
        );
        if (res.status === 410) {
          setStreamEnded(true);
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

        if (body.liveChatId) youtubePollRef.current.liveChatId = body.liveChatId;
        if (body.nextPageToken) youtubePollRef.current.pageToken = body.nextPageToken;
        if (body.pollingIntervalMs) youtubePollRef.current.intervalMs = body.pollingIntervalMs;

        if (body.messages?.length) {
          setYoutubeMessages((prev) => {
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
        timer = setTimeout(() => void tick(), youtubePollRef.current.intervalMs);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [channelId, meta?.provider, streamEnded, token]);

  const platformMessages = useMemo(() => {
    if (meta?.provider === "TWITCH") return twitch.messages;
    if (meta?.provider === "CHZZK") return chzzk.messages;
    if (meta?.provider === "YOUTUBE") return youtubeMessages;
    return [] as PlatformChatMessage[];
  }, [meta?.provider, twitch.messages, chzzk.messages, youtubeMessages]);

  const platformConnected = useMemo(() => {
    if (meta?.provider === "TWITCH") return twitch.connected;
    if (meta?.provider === "CHZZK") return chzzk.connected;
    if (meta?.provider === "YOUTUBE") {
      return youtubeMessages.length > 0 || !!youtubePollRef.current.liveChatId;
    }
    return false;
  }, [meta?.provider, twitch.connected, chzzk.connected, youtubeMessages.length]);

  const messages = useMemo(
    () =>
      mergeUnifiedChatMessages([
        mocomoMessages,
        platformToUnified(platformMessages),
      ]),
    [mocomoMessages, platformMessages]
  );

  return { messages, meta, platformConnected, streamEnded };
}
