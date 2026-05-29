"use client";

import { LiveViewerPlayer } from "@/components/live/live-viewer-player";
import { LiveChat } from "@/components/live/live-chat";
import type { LiveTipAlert } from "@/components/live/live-tip-alerts";

/** 시청자 — HLS + 채팅 */
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
    <div className="live-studio-panel space-y-4 p-3 sm:p-5">
      <h1 className="text-lg font-bold border-b border-border pb-3">{channelName}</h1>
      <div className="grid lg:grid-cols-[1fr_minmax(280px,360px)] gap-4 items-start">
        <LiveViewerPlayer channelId={channelId} />
        <LiveChat
          channelId={channelId}
          viewerCount={viewerCount}
          onViewerCount={onViewerCount}
          onRecentTips={onRecentTips}
        />
      </div>
    </div>
  );
}
