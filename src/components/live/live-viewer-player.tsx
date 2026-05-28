"use client";

import { LiveHlsPlayer } from "@/components/live/live-hls-player";

/** 시청 — SRS HLS (WebRTC/LiveKit 미사용) */
export function LiveViewerPlayer({ channelId }: { channelId: string; hostUserId?: string }) {
  return <LiveHlsPlayer channelId={channelId} />;
}
