"use client";

/**
 * External platform iframe player with MoCoMo overlay chrome (outside iframe, pointer-events safe).
 * Works for YouTube, Twitch, and Chzzk embeds.
 */

import { useCallback, useRef } from "react";
import { ExternalLink, Link2, Maximize2, Radio } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { YoutubeEmbedGuide } from "@/components/live/youtube-embed-guide";
import { providerDisplayName } from "@/lib/live-external/platform-metadata";
import type { LiveExternalProvider } from "@/lib/live-external/types";

type Props = {
  provider: LiveExternalProvider;
  embedUrl: string | null;
  watchUrl: string;
  title: string;
  embedSupported: boolean;
  isHost?: boolean;
  hostImage?: string | null;
  hostUsername?: string;
};

export function ExternalLivePlayer({
  provider,
  embedUrl,
  watchUrl,
  title,
  embedSupported,
  isHost = false,
  hostImage,
  hostUsername,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const showIframe = embedSupported && !!embedUrl;

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
            {/* MoCoMo overlay chrome — never blocks iframe controls (pointer-events-none except buttons) */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <div className="bg-gradient-to-b from-black/75 via-black/30 to-transparent px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0 border border-white/20">
                    <AvatarImage src={hostImage ?? undefined} />
                    <AvatarFallback className="bg-folk-cobalt text-[10px] text-white">
                      {hostUsername?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{title}</p>
                    <p className="text-[11px] text-white/65">{providerDisplayName(provider)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-t from-black/80 via-black/25 to-transparent px-3 py-2 sm:px-4">
                <div className="flex items-end justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                    <Radio className="h-3 w-3" />
                    라이브
                  </span>
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
