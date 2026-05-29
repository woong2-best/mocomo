"use client";

import { LiveObsStudio } from "@/components/live/live-obs-studio";
import { LiveHlsPlayer } from "@/components/live/live-hls-player";
import { LiveChat } from "@/components/live/live-chat";
import type { LiveTipAlert } from "@/components/live/live-tip-alerts";
import { Radio } from "lucide-react";

/** 호스트 스튜디오 — 영상(미리보기) + OBS 키 + 채팅 (치지직/트위치 레이아웃) */
export function LiveHostStudioShell({
  channelId,
  channelName,
  viewerCount,
  onViewerCount,
  onEndStream,
  onRecentTips,
}: {
  channelId: string;
  channelName: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  onEndStream: () => void;
  onRecentTips?: (tips: LiveTipAlert[]) => void;
}) {
  return (
    <div className="live-studio-twitch space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="live-badge text-xs px-2.5 py-0.5 flex items-center gap-1">
          <Radio className="h-3 w-3" />
          LIVE
        </span>
        <h1 className="text-base sm:text-lg font-bold truncate flex-1">{channelName}</h1>
        <span className="text-sm text-muted-foreground tabular-nums">{viewerCount} 시청</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3 xl:gap-4 items-start">
        <div className="space-y-3 min-w-0">
          <div className="rounded-xl overflow-hidden ring-1 ring-border/50 bg-black">
            <LiveHlsPlayer channelId={channelId} />
          </div>
          <p className="text-[11px] text-muted-foreground px-1">
            방송 미리보기 (OBS 시작 후 3~10초 뒤 표시). 스트림 키는 아래 OBS 패널에만 표시됩니다.
          </p>
          <LiveObsStudio channelId={channelId} onEndStream={onEndStream} />
        </div>

        <div className="xl:sticky xl:top-16 min-h-[min(70vh,560px)]">
          <LiveChat
            channelId={channelId}
            viewerCount={viewerCount}
            onViewerCount={onViewerCount}
            isHost
            canModerate
            onRecentTips={onRecentTips}
          />
        </div>
      </div>
    </div>
  );
}
