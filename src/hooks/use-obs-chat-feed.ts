"use client";
import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");



import { errorText } from "@/lib/i18n/error-text";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LiveExternalProvider } from "@/lib/live-external/types";
import {
  mergeUnifiedChatMessages,
  platformToUnified,
  type UnifiedChatMessage,
} from "@/lib/live-external/platform-chat/merge-messages";
import { useTwitchLiveChat } from "@/hooks/use-twitch-live-chat";
import { useChzzkLiveChat } from "@/hooks/use-chzzk-live-chat";

const MAX_MESSAGES = 200;

type FeedMeta = {
  provider: LiveExternalProvider;
  externalId?: string;
} | null;

type FeedState = "loading" | "live" | "ended" | "error";

/**
 * OBS browser source — one URL for MoCoMo + YouTube/Twitch/Chzzk chat.
 * YouTube: server poll via /feed. Twitch/Chzzk: client WS after meta from /feed.
 */
export function useObsChatFeed(
  channelId: string,
  token: string,
  options?: { feedPath?: string; platformChatPath?: string }
) {
  const [feedMessages, setFeedMessages] = useState<UnifiedChatMessage[]>([]);
  const [meta, setMeta] = useState<FeedMeta>(null);
  const [feedPlatformReady, setFeedPlatformReady] = useState(false);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [state, setState] = useState<FeedState>("loading");
  const [error, setError] = useState<string | null>(null);

  const [boundChannelId, setBoundChannelId] = useState(channelId);
  const boundChannelRef = useRef(channelId);
  const sinceRef = useRef(new Date(Date.now() - 10 * 60_000).toISOString());
  const pollRef = useRef({
    pageToken: null as string | null,
    liveChatId: null as string | null,
    intervalMs: 3000,
  });

  const streamEnded = state === "ended";

  const twitch = useTwitchLiveChat(
    meta?.provider === "TWITCH" ? meta.externalId ?? null : null,
    meta?.provider === "TWITCH" && !streamEnded
  );

  const chzzkSessionUrl = useCallback(
    (id: string) => {
      const path =
        options?.platformChatPath ??
        `/api/overlay/${encodeURIComponent(id)}/platform-chat`;
      return `${path}?token=${encodeURIComponent(token)}&kind=session`;
    },
    [options?.platformChatPath, token]
  );

  const chzzk = useChzzkLiveChat(boundChannelId, meta?.provider === "CHZZK" && !streamEnded, {
    sessionUrl: chzzkSessionUrl,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelled) return;
      try {
        const q = new URLSearchParams({ token, since: sinceRef.current });
        if (pollRef.current.pageToken) q.set("pageToken", pollRef.current.pageToken);
        if (pollRef.current.liveChatId) q.set("liveChatId", pollRef.current.liveChatId);

        const feedPath = options?.feedPath ?? `/api/overlay/${channelId}/feed`;
        const res = await fetch(`${feedPath}?${q}`, { cache: "no-store" });
        if (res.status === 410) {
          setState("loading");
          setError(null);
          setMeta(null);
          setFeedMessages([]);
          if (!cancelled) {
            timer = setTimeout(() => void tick(), Math.max(pollRef.current.intervalMs, 4000));
          }
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(errorText(body?.error ?? i18n("hooks.s1u5ixy")));
          setState("error");
          if (!cancelled) {
            timer = setTimeout(() => void tick(), Math.max(pollRef.current.intervalMs, 5000));
          }
          return;
        }

        const data = (await res.json()) as {
          messages?: UnifiedChatMessage[];
          deletedIds?: string[];
          meta?: FeedMeta;
          platformReady?: boolean;
          platformError?: string | null;
          nextPageToken?: string | null;
          liveChatId?: string | null;
          pollingIntervalMs?: number;
          live?: boolean;
          channelId?: string | null;
        };
        if (cancelled) return;

        let switchedChannel = false;
        if (typeof data.channelId === "string" && data.channelId !== boundChannelRef.current) {
          const previous = boundChannelRef.current;
          boundChannelRef.current = data.channelId;
          setBoundChannelId(data.channelId);
          if (previous) {
            switchedChannel = true;
            setFeedMessages([]);
            sinceRef.current = new Date(Date.now() - 60_000).toISOString();
            pollRef.current.pageToken = null;
            pollRef.current.liveChatId = null;
          }
        }

        if (data.live === false) {
          setState("loading");
          setError(null);
          setMeta(null);
          setFeedMessages([]);
        } else if (data.meta) setMeta(data.meta);
        if (data.live !== false) {
          setFeedPlatformReady(!!data.platformReady);
          setPlatformError(data.platformError ?? null);
          setState("live");
          setError(null);
        }

        if (data.liveChatId) pollRef.current.liveChatId = data.liveChatId;
        if (data.nextPageToken) pollRef.current.pageToken = data.nextPageToken;
        if (data.pollingIntervalMs) pollRef.current.intervalMs = data.pollingIntervalMs;

        if (!switchedChannel && (data.messages?.length || data.deletedIds?.length)) {
          const incoming = data.messages ?? [];
          const deleted = new Set(data.deletedIds ?? []);
          setFeedMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const m of incoming) map.set(m.id, m);
            for (const id of deleted) map.delete(id);
            const next = [...map.values()]
              .sort((a, b) => a.at - b.at)
              .slice(-MAX_MESSAGES);
            const last = next[next.length - 1];
            if (last) sinceRef.current = new Date(last.at).toISOString();
            return next;
          });
        }
      } catch {
        if (!cancelled) {
          setError(i18n("support.s10f9nog"));
          setState("error");
        }
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
  }, [channelId, options?.feedPath, token]);

  const platformMessages = useMemo(() => {
    if (meta?.provider === "TWITCH") return platformToUnified(twitch.messages);
    if (meta?.provider === "CHZZK") return platformToUnified(chzzk.messages);
    return [] as UnifiedChatMessage[];
  }, [meta?.provider, twitch.messages, chzzk.messages]);

  const messages = useMemo(
    () => mergeUnifiedChatMessages([feedMessages, platformMessages]),
    [feedMessages, platformMessages]
  );

  const platformReady = useMemo(() => {
    if (meta?.provider === "TWITCH") return twitch.connected;
    if (meta?.provider === "CHZZK") return chzzk.connected;
    return feedPlatformReady;
  }, [meta?.provider, twitch.connected, chzzk.connected, feedPlatformReady]);

  return { messages, meta, platformReady, platformError, state, error };
}
