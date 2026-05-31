"use client";

import { LiveBroadcastPlayer } from "@/components/live/live-broadcast-player";

/** 시청 — LiveKit WebRTC(브라우저) 또는 HLS */
export function LiveViewerPlayer({
  channelId,
  hostUserId,
}: {
  channelId: string;
  hostUserId?: string;
}) {
  return (
    <LiveBroadcastPlayer channelId={channelId} hostUserId={hostUserId} />
  );
}
