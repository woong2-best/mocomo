"use client";

/**
 * Pure external iframe player — NO overlays, chat, or donation UI on top of the video.
 * Chat/donations must live in a sibling panel only.
 */

import { ExternalLink } from "lucide-react";
import { YoutubeEmbedGuide } from "@/components/live/youtube-embed-guide";
import type { LiveExternalProvider } from "@/lib/live-external/types";

type Props = {
  provider: LiveExternalProvider;
  embedUrl: string | null;
  watchUrl: string;
  title: string;
  embedSupported: boolean;
  isHost?: boolean;
};

export function ExternalLivePlayer({
  provider,
  embedUrl,
  watchUrl,
  title,
  embedSupported,
  isHost = false,
}: Props) {
  const showIframe = embedSupported && !!embedUrl;

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-xl bg-black">
      <div className="relative aspect-video w-full min-h-[240px] bg-black">
        {showIframe ? (
          <iframe
            title={title}
            src={embedUrl}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
            {provider === "YOUTUBE" && isHost ? (
              <YoutubeEmbedGuide variant="player" watchUrl={watchUrl} />
            ) : (
              <>
                <p className="text-sm text-white/80">
                  {provider === "CHZZK"
                    ? "치지직 임베드가 이 환경에서 지원되지 않습니다."
                    : "이 플랫폼은 현재 임베드 대신 원본 페이지에서 시청해 주세요."}
                </p>
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                >
                  <ExternalLink className="h-4 w-4" />
                  새 창에서 시청하기
                </a>
              </>
            )}
          </div>
        )}
      </div>
      {showIframe ? (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2 text-xs text-white/70">
          <span>{providerLabel(provider)} · 영상만 표시 (오버레이 없음)</span>
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
          >
            원본에서 열기
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function providerLabel(p: LiveExternalProvider): string {
  if (p === "YOUTUBE") return "YouTube";
  if (p === "TWITCH") return "Twitch";
  return "치지직";
}
