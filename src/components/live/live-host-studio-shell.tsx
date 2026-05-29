"use client";

import { LiveObsStudio } from "@/components/live/live-obs-studio";
import { LiveChat } from "@/components/live/live-chat";
import type { LiveTipAlert } from "@/components/live/live-tip-alerts";
import { Monitor } from "lucide-react";

/**
 * 호스트 스튜디오 — LiveKit/동적 import 없음 (d.map 크래시 방지).
 * OBS RTMP 키 + 채팅만 제공.
 */
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
    <div className="live-studio-panel space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="live-badge text-xs px-3 py-1">LIVE</span>
        <h1 className="text-lg font-bold truncate flex-1">{channelName}</h1>
        <span className="text-sm text-muted-foreground tabular-nums">{viewerCount} 시청</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Monitor className="h-4 w-4" />
        <span>
          <strong className="text-foreground">OBS</strong>로 송출 (SRS → HLS)
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(280px,360px)] gap-4 items-start">
        <LiveObsStudio channelId={channelId} onEndStream={onEndStream} />
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
  );
}
