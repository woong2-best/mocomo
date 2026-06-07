"use client";

import type { LiveBroadcastMode } from "@prisma/client";
import { LiveBroadcastPlayer } from "@/components/live/live-broadcast-player";

/** 시청 — LiveKit WebRTC(브라우저) 또는 HLS */
export function LiveViewerPlayer({
  channelId,
  hostUserId,
  broadcastMode,
}: {
  channelId: string;
  hostUserId?: string;
  broadcastMode?: LiveBroadcastMode | null;
}) {
  return (
    <LiveBroadcastPlayer
      channelId={channelId}
      hostUserId={hostUserId}
      broadcastMode={broadcastMode}
    />
  );
}
