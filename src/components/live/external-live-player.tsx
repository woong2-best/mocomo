"use client";

/**
 * External platform iframe player — clean embed without title/avatar overlay.
 */

import { useCallback, useEffect, useRef } from "react";
import { ExternalLink, Link2, Maximize2 } from "lucide-react";
import { YoutubeEmbedGuide } from "@/components/live/youtube-embed-guide";
import { providerDisplayName } from "@/lib/live-external/platform-metadata";
import type { LiveExternalProvider } from "@/lib/live-external/types";

const YT_EMBED_ORIGINS = new Set([
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
]);

type Props = {
  provider: LiveExternalProvider;
  embedUrl: string | null;
  watchUrl: string;
  title: string;
  embedSupported: boolean;
  isHost?: boolean;
  hostImage?: string | null;
  hostUsername?: string;
  onPlatformEnded?: () => void;
};

export function ExternalLivePlayer({
  provider,
  embedUrl,
  watchUrl,
  title,
  embedSupported,
  isHost = false,
  onPlatformEnded,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sawLiveRef = useRef(false);
  const endedRef = useRef(false);
  const showIframe = embedSupported && !!embedUrl;

  const signalEnded = useCallback(() => {
    if (endedRef.current || !onPlatformEnded) return;
    endedRef.current = true;
    onPlatformEnded();
  }, [onPlatformEnded]);

  useEffect(() => {
    if (provider !== "YOUTUBE" || !onPlatformEnded) return;

    function onMessage(event: MessageEvent) {
      if (!YT_EMBED_ORIGINS.has(event.origin)) return;
      if (typeof event.data !== "string" || !event.data.startsWith("{")) return;
      try {
        const data = JSON.parse(event.data) as {
          event?: string;
          info?: unknown;
        };

        if (data.event === "infoDelivery" && data.info && typeof data.info === "object") {
          const info = data.info as {
            isLive?: boolean;
            videoData?: { isLive?: boolean };
          };
          const liveFlag = info.isLive ?? info.videoData?.isLive;
          if (liveFlag === true) sawLiveRef.current = true;
          if (liveFlag === false && sawLiveRef.current) signalEnded();
        }

        if (data.event === "onStateChange" && data.info === 0 && sawLiveRef.current) {
          signalEnded();
        }
      } catch {
        /* ignore non-JSON postMessages */
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [provider, onPlatformEnded, signalEnded]);

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
        {showIframe ? (
          <>
            <iframe
              title={title}
              src={embedUrl}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-2 sm:p-3">
              <div className="pointer-events-auto flex items-center gap-1.5">
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="원본에서 열기"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <Link2 className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  title="전체 화면"
                  onClick={() => void toggleFullscreen()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
            {provider === "YOUTUBE" && isHost ? (
              <YoutubeEmbedGuide variant="player" watchUrl={watchUrl} />
            ) : (
              <>
                <p className="text-sm text-white/80">
                  {provider === "CHZZK"
                    ? "치지직 임베드가 이 환경에서 지원되지 않습니다."
                    : provider === "TWITCH"
                      ? "Twitch 임베드를 불러오지 못했습니다."
                      : "이 플랫폼은 현재 임베드 대신 원본 페이지에서 시청해 주세요."}
                </p>
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                >
                  <ExternalLink className="h-4 w-4" />
                  {providerDisplayName(provider)}에서 보기
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
