"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
/**
 * External platform iframe player — clean embed without title/avatar overlay.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ExternalLink, Maximize2, Minimize2, Pause, Play, User } from "lucide-react";
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
  hostUsername,
  posterUrl,
  externalId,
  onPlatformEnded,
}: Props) {
  const { t } = useLocale();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sawLiveRef = useRef(false);
  const endedRef = useRef(false);
  const liveSeekDoneRef = useRef(false);
  const liveSeekAttemptsRef = useRef(0);
  const pausedRef = useRef(false);
  const [pageOrigin, setPageOrigin] = useState("");
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [chromeOpen, setChromeOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const stillUrl = resolvePlayerStillThumb({
    posterUrl,
    provider,
    embedUrl,
    externalId,
  });
  const canPlay = embedSupported && !!embedUrl;
  const holdFrame = paused && provider !== "YOUTUBE" && playbackStarted && canPlay;
  const showIframe = canPlay && playbackStarted && !holdFrame;
  const immersive = isFullscreen || expanded;
  pausedRef.current = paused;
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
    if (pausedRef.current) return;
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
    setChromeOpen(false);
    setPaused(false);
    setExpanded(false);
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
        if (pausedRef.current) {
          if (data.info === 1) {
            postYoutubeCommand(iframeRef.current, "pauseVideo", [], event.origin);
          }
          return;
        }
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

  const pauseSyncedRef = useRef(false);
  useEffect(() => {
    if (provider !== "YOUTUBE" || !showIframe) {
      pauseSyncedRef.current = false;
      return;
    }
    const origin = youtubeFrameOrigin(playerSrc);
    if (!pauseSyncedRef.current) {
      pauseSyncedRef.current = true;
      if (paused) postYoutubeCommand(iframeRef.current, "pauseVideo", [], origin);
      return;
    }
    if (paused) {
      postYoutubeCommand(iframeRef.current, "pauseVideo", [], origin);
      return;
    }
    // Resume joins the live head. Playing from the paused timestamp would stay in DVR.
    liveSeekDoneRef.current = false;
    liveSeekAttemptsRef.current = 0;
    seekYoutubeLiveHead(iframeRef.current, origin);
    postYoutubeCommand(iframeRef.current, "playVideo", [], origin);
  }, [paused, playerSrc, provider, showIframe]);

  useEffect(() => {
    if (!chromeOpen || paused) return;
    const id = window.setTimeout(() => setChromeOpen(false), 4000);
    return () => window.clearTimeout(id);
  }, [chromeOpen, paused]);

  useEffect(() => {
    function sync() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
      setExpanded(false);
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    try {
      await el.requestFullscreen();
    } catch {
      setExpanded(true);
    }
  }, [expanded]);

  const leavePlayer = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (window.history.length > 1) router.back();
    else router.push("/live");
  }, [expanded, router]);

  const profileSlug = hostUsername?.trim() || "";

  return (
    <div
      ref={containerRef}
      className={
        immersive
          ? "external-live-player fixed inset-0 z-[260] h-[100dvh] w-screen overflow-hidden bg-black"
          : "external-live-player relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-border/40"
      }
    >
      <div
        className={
          immersive
            ? "relative h-full min-h-full w-full bg-black"
            : "relative aspect-video w-full min-h-[220px] bg-black"
        }
      >
        {!playbackStarted && canPlay ? (
          <button
            type="button"
            onClick={() => setPlaybackStarted(true)}
            className="absolute inset-0 z-10 block h-full w-full cursor-pointer border-0 bg-transparent p-0"
            aria-label={title}
          >
            <LiveStillPoster src={stillUrl} />
          </button>
        ) : null}
        {holdFrame ? <LiveStillPoster src={stillUrl} /> : null}
        {showIframe ? (
          <iframe
            ref={iframeRef}
            title={title}
            src={playerSrc ?? embedUrl ?? undefined}
            className="pointer-events-none absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            tabIndex={-1}
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              if (provider !== "YOUTUBE") return;
              const frameOrigin = youtubeFrameOrigin(playerSrc);
              handshakeYoutube(iframeRef.current, frameOrigin);
              if (pausedRef.current) {
                postYoutubeCommand(iframeRef.current, "pauseVideo", [], frameOrigin);
                return;
              }
              snapToLiveEdge(frameOrigin, true);
            }}
          />
        ) : null}
        {canPlay && playbackStarted ? (
          <div className="absolute inset-0 z-30">
            <button
              type="button"
              className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
              aria-label={chromeOpen ? t("live.embed.hideControls") : t("live.embed.showControls")}
              onClick={() => setChromeOpen((open) => !open)}
            />
            {chromeOpen ? (
              <div className="pointer-events-none absolute inset-0">
                <div className="pointer-events-none absolute inset-0 bg-black/25" />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-2 sm:p-3">
                  <button
                    type="button"
                    onClick={leavePlayer}
                    className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                    aria-label={t("common.back")}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <div className="pointer-events-none flex items-center gap-2">
                    {profileSlug ? (
                      <Link
                        href={`/u/${profileSlug}`}
                        prefetch
                        className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#6D6E70] text-white"
                        aria-label={t("settings.profile")}
                      >
                        <User className="h-5 w-5" />
                      </Link>
                    ) : null}
                    <a
                      href={watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("live.s1gvpdd4")}
                      className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void toggleFullscreen()}
                      className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
                      aria-label={immersive ? t("reels.s9nk1fb") : t("live.sqkc2hc")}
                    >
                      {immersive ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  className="pointer-events-auto absolute left-1/2 top-1/2 inline-flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label={paused ? t("media.sz0s1") : t("media.spzasrv")}
                >
                  {paused ? <Play className="h-8 w-8 fill-white" /> : <Pause className="h-8 w-8 fill-white" />}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {!canPlay ? (
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
        ) : null}
      </div>
    </div>
  );
}
