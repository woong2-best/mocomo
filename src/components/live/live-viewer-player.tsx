"use client";

import { LiveBroadcastPlayer } from "@/components/live/live-broadcast-player";

/** 시청 — LiveKit WebRTC 또는 SRS HLS */
export function LiveViewerPlayer({ channelId }: { channelId: string; hostUserId?: string }) {
  return <LiveBroadcastPlayer channelId={channelId} />;
}
