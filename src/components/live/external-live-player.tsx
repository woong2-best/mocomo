"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
/**
 * External platform iframe player — clean embed without title/avatar overlay.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Link2, Maximize2 } from "lucide-react";
import { YoutubeEmbedGuide } from "@/components/live/youtube-embed-guide";
import { LiveStillPoster } from "@/components/live/live-still-poster";
import { withYoutubeLiveEmbedParams } from "@/lib/live-external/parse";
import { providerDisplayName } from "@/lib/live-external/platform-metadata";
import { resolvePlayerStillThumb } from "@/lib/live-preview-thumb";
import type { LiveExternalProvider } from "@/lib/live-external/types";

const YT_EMBED_ORIGINS = new Set([
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
]);

/** Behind more than this is DVR/resume, not YouTube's normal live delay. */
const YT_LIVE_DVR_BEHIND_SEC = 15;
const YT_LIVE_SEEK_MAX = 6;

type YtPlayerInfo = {
  currentTime?: number;
  duration?: number;
  isLive?: boolean;
  videoData?: { isLive?: boolean };
};

function parseYtMessage(data: unknown): { event?: string; info?: unknown } | null {
  if (typeof data === "string") {
    if (!data.startsWith("{")) return null;
    try {
      return JSON.parse(data) as { event?: string; info?: unknown };
    } catch {
      return null;
    }
  }
  if (data && typeof data === "object") {
    return data as { event?: string; info?: unknown };
  }
  return null;
}

function postYoutubeCommand(
  iframe: HTMLIFrameElement | null,
  func: string,
  args: unknown[] = [],
  targetOrigin = "*"
) {
  const win = iframe?.contentWindow;
  if (!win) return;
  win.postMessage(JSON.stringify({ event: "command", func, args }), targetOrigin);
}

function handshakeYoutube(iframe: HTMLIFrameElement | null, targetOrigin = "*") {
  const win = iframe?.contentWindow;
  if (!win) return;
  win.postMessage(JSON.stringify({ event: "listening" }), targetOrigin);
  postYoutubeCommand(iframe, "addEventListener", ["onReady"], targetOrigin);
  postYoutubeCommand(iframe, "addEventListener", ["onStateChange"], targetOrigin);
}

function seekYoutubeLiveHead(iframe: HTMLIFrameElement | null, targetOrigin = "*") {
  // YouTube clamps an overshoot to the live head on DVR-enabled lives.
  postYoutubeCommand(iframe, "seekTo", [1e10, true], targetOrigin);
}

function youtubeFrameOrigin(embedUrl: string | null): string {
  try {
    if (embedUrl) return new URL(embedUrl).origin;
  } catch {
    /* ignore */
  }
  return "https://www.youtube-nocookie.com";
}

type Props = {
  provider: LiveExternalProvider;
  embedUrl: string | null;
  watchUrl: string;
  title: string;
  embedSupported: boolean;
  isHost?: boolean;
  hostImage?: string | null;
  hostUsername?: string;
  posterUrl?: string | null;
  externalId?: string | null;
  onPlatformEnded?: () => void;
};

export function ExternalLivePlayer({
  provider,
  embedUrl,
  watchUrl,
  title,
  embedSupported,
  isHost = false,
  posterUrl,
  externalId,
  onPlatformEnded,
}: Props) {
  const { t } = useLocale();

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sawLiveRef = useRef(false);
  const endedRef = useRef(false);
  const liveSeekDoneRef = useRef(false);
  const liveSeekAttemptsRef = useRef(0);
  const [pageOrigin, setPageOrigin] = useState("");
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const stillUrl = resolvePlayerStillThumb({
    posterUrl,
    provider,
    embedUrl,
    externalId,
  });
  const showIframe = embedSupported && !!embedUrl && playbackStarted;
  const playerSrc = useMemo(() => {
    if (!embedUrl) return null;
    if (provider !== "YOUTUBE") return embedUrl;
    return withYoutubeLiveEmbedParams(embedUrl, pageOrigin || null);
  }, [embedUrl, pageOrigin, provider]);

  const signalEnded = useCallback(() => {
    if (endedRef.current || !onPlatformEnded) return;
    endedRef.current = true;
    onPlatformEnded();
  }, [onPlatformEnded]);

  const snapToLiveEdge = useCallback((origin: string, force = false) => {
    if (liveSeekDoneRef.current) return;
    if (!force && liveSeekAttemptsRef.current >= YT_LIVE_SEEK_MAX) {
      liveSeekDoneRef.current = true;
      return;
    }
    liveSeekAttemptsRef.current += 1;
    seekYoutubeLiveHead(iframeRef.current, origin);
  }, []);

  useEffect(() => {
    setPageOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    liveSeekDoneRef.current = false;
    liveSeekAttemptsRef.current = 0;
    sawLiveRef.current = false;
    endedRef.current = false;
    setPlaybackStarted(false);
  }, [embedUrl]);

  useEffect(() => {
    if (provider !== "YOUTUBE" || !showIframe) return;

    function onMessage(event: MessageEvent) {
      if (!YT_EMBED_ORIGINS.has(event.origin)) return;
      const data = parseYtMessage(event.data);
      if (!data) return;

      if (data.event === "listening" || data.event === "onReady" || data.event === "initialDelivery") {
        handshakeYoutube(iframeRef.current, event.origin);
        snapToLiveEdge(event.origin, true);
      }

      if (data.event === "onStateChange") {
        // 1 = playing — join should land on the live head, not DVR resume.
        if (data.info === 1) snapToLiveEdge(event.origin);
        if (data.info === 0 && sawLiveRef.current) signalEnded();
      }

      if (data.event === "infoDelivery" && data.info && typeof data.info === "object") {
        const info = data.info as YtPlayerInfo;
        const liveFlag = info.isLive ?? info.videoData?.isLive;
        if (liveFlag === true) sawLiveRef.current = true;
        if (liveFlag === false && sawLiveRef.current) {
          signalEnded();
          return;
        }
        if (liveFlag === false) return;

        const current = info.currentTime;
        const duration = info.duration;
        if (typeof current === "number" && typeof duration === "number" && duration > 0) {
          const behind = duration - current;
          if (behind > YT_LIVE_DVR_BEHIND_SEC) {
            snapToLiveEdge(event.origin);
          } else if (liveSeekAttemptsRef.current > 0) {
            liveSeekDoneRef.current = true;
          }
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [provider, showIframe, signalEnded, snapToLiveEdge]);

  useEffect(() => {
    if (provider !== "YOUTUBE" || !showIframe || !playerSrc) return;
    const frameOrigin = youtubeFrameOrigin(playerSrc);
    const timers = [350, 1200, 2800].map((ms) =>
      window.setTimeout(() => {
        handshakeYoutube(iframeRef.current, frameOrigin);
        snapToLiveEdge(frameOrigin);
      }, ms)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [playerSrc, provider, showIframe, snapToLiveEdge]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* browser may block */
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="external-live-player relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-border/40"
    >
      <div className="relative aspect-video w-full min-h-[220px] bg-black">
        {!playbackStarted && embedSupported && embedUrl ? (
          <button
            type="button"
            onClick={() => setPlaybackStarted(true)}
            className="absolute inset-0 z-10 block h-full w-full cursor-pointer border-0 bg-transparent p-0"
            aria-label={title}
          >
            <LiveStillPoster src={stillUrl} />
          </button>
        ) : null}
        {showIframe ? (
          <>
            <iframe
              ref={iframeRef}
              title={title}
              src={playerSrc ?? embedUrl}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => {
                if (provider !== "YOUTUBE") return;
                const frameOrigin = youtubeFrameOrigin(playerSrc);
                handshakeYoutube(iframeRef.current, frameOrigin);
                snapToLiveEdge(frameOrigin, true);
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-2 sm:p-3">
              <div className="pointer-events-auto flex items-center gap-1.5">
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("live.s1gvpdd4")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <Link2 className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  title={t("live.sqkc2hc")}
                  onClick={() => void toggleFullscreen()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : !playbackStarted && embedSupported && embedUrl ? null : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
            {provider === "YOUTUBE" && isHost ? (
              <YoutubeEmbedGuide variant="player" watchUrl={watchUrl} />
            ) : (
              <>
                <p className="text-sm text-white/80">
                  {provider === "CHZZK"
                    ? t("live.s13otgp5")
                    : provider === "TWITCH"
                      ? t("live.twitch")
                      : t("live.s54i56q")}
                </p>
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("live.external.watchOn", { provider: providerDisplayName(provider) })}
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
