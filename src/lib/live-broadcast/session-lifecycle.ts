import type { LiveStreamStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { BroadcastSessionPhase } from "@/lib/live-broadcast/types";

export function resolveBroadcastPhase(
  isLive: boolean,
  liveStatus: LiveStreamStatus,
  endedAt: Date | null
): BroadcastSessionPhase {
  if (liveStatus === "ENDED" || endedAt) return "ENDED";
  if (liveStatus === "SCHEDULED" && !endedAt) return "SCHEDULED";
  if (isLive && liveStatus === "LIVE") return "LIVE";
  if (liveStatus === "LIVE" && !isLive) return "SCHEDULED";
  if (isLive) return "ORPHAN";
  return "ENDED";
}

export const SESSION_END_DATA = {
  isLive: false,
  liveStatus: "ENDED" as const,
  endedAt: new Date(),
  rtmpIngressId: null,
  rtmpUrl: null,
  rtmpStreamKey: null,
  livePublisherTabId: null,
  liveOverlayJson: Prisma.DbNull,
};
