"use client";

import { LiveViewerPlayer } from "@/components/live/live-viewer-player";
import { LiveChat } from "@/components/live/live-chat";
import type { LiveTipAlert } from "@/components/live/live-tip-alerts";

/** 시청자 — 영상 + 채팅 (치지직/트위치 레이아웃) */
export function LiveViewerShell({
  channelId,
  channelName,
  viewerCount,
  onViewerCount,
  onRecentTips,
}: {
  channelId: string;
  channelName: string;
  viewerCount: number;
  onViewerCount?: (n: number) => void;
  onRecentTips?: (tips: LiveTipAlert[]) => void;
}) {
  return (
    <div className="live-studio-twitch space-y-3">
      <h1 className="text-base sm:text-lg font-bold px-1 truncate">{channelName}</h1>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-3 xl:gap-4 items-start">
        <div className="min-w-0 rounded-xl overflow-hidden ring-1 ring-border/50 bg-black">
          <LiveViewerPlayer channelId={channelId} />
        </div>
        <div className="xl:sticky xl:top-16 min-h-[min(70vh,560px)]">
          <LiveChat
            channelId={channelId}
            viewerCount={viewerCount}
            onViewerCount={onViewerCount}
            onRecentTips={onRecentTips}
          />
        </div>
      </div>
    </div>
  );
}
