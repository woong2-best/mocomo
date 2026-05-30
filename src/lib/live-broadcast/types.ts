import type { LiveStreamStatus } from "@prisma/client";

/** 호스트 방송 세션 상태 (DB liveStatus + isLive 조합) */
export type BroadcastSessionPhase = "SCHEDULED" | "LIVE" | "ENDED" | "ORPHAN";

export type SessionReleaseReason =
  | "HOST_END"
  | "OBS_UNPUBLISH"
  | "AUTO_STALE"
  | "AUTO_REPLACE"
  | "HOST_PREPARE"
  | "ADMIN_FORCE"
  | "ABANDONED";

export type HostBroadcastSession = {
  channelId: string;
  name: string;
  phase: BroadcastSessionPhase;
  isLive: boolean;
  liveStatus: LiveStreamStatus;
  createdAt: Date;
  endedAt: Date | null;
  broadcastMode: string;
  hasActiveViewers: boolean;
  hostRecentlyPresent: boolean;
};

export type PrepareBroadcastResult =
  | {
      ok: true;
      released: { channelId: string; name: string; reason: SessionReleaseReason }[];
    }
  | { ok: false; error: string; blockingChannelId?: string };
