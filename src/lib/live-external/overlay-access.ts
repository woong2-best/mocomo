import type { LiveStreamStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { canViewerEnterLiveRoom } from "@/lib/live-channel-active";
import { activeHostBroadcastWhere } from "@/lib/live-broadcast/session-queries";
import type { OverlayTokenPayload } from "@/lib/live-external/overlay-token";
import type { LiveExternalProvider } from "@/lib/live-external/types";

const overlayBroadcastSelect = {
  id: true,
  createdBy: true,
  createdAt: true,
  isLive: true,
  liveStatus: true,
  broadcastMode: true,
  mediaSourceType: true,
  externalProvider: true,
  externalId: true,
  externalChannelId: true,
  connectedStreamingAccountId: true,
} as const;

export type OverlayBroadcastRow = {
  id: string;
  createdBy: string;
  createdAt: Date;
  isLive: boolean;
  liveStatus: LiveStreamStatus;
  broadcastMode: string;
  mediaSourceType: string;
  externalProvider: string | null;
  externalId: string | null;
  externalChannelId: string | null;
  connectedStreamingAccountId: string | null;
};

export type OverlayBroadcastAccess =
  | { ok: true; channel: OverlayBroadcastRow }
  | { ok: false; error: string; status: number };

function isOverlayBroadcastActive(channel: OverlayBroadcastRow): boolean {
  if (channel.liveStatus === "ENDED") return false;
  return canViewerEnterLiveRoom({
    isLive: channel.isLive,
    liveStatus: channel.liveStatus,
  });
}

function broadcastSidMatches(channel: OverlayBroadcastRow, tokenPayload: OverlayTokenPayload): boolean {
  if (tokenPayload.broadcastSid == null) return true;
  return tokenPayload.broadcastSid === Math.floor(channel.createdAt.getTime() / 1000);
}

/** Token is for this host — follow their current live when the URL's channel has ended. */
export async function assertOverlayBroadcastAccess(
  channelId: string,
  tokenPayload: OverlayTokenPayload
): Promise<OverlayBroadcastAccess> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: overlayBroadcastSelect,
  });

  if (!channel) {
    return { ok: false, error: "Stream not found.", status: 404 };
  }

  if (broadcastSidMatches(channel, tokenPayload) && isOverlayBroadcastActive(channel)) {
    return { ok: true, channel };
  }

  const current = await db.voiceChannel.findFirst({
    where: activeHostBroadcastWhere(channel.createdBy),
    orderBy: { createdAt: "desc" },
    select: overlayBroadcastSelect,
  });

  if (current && current.createdBy === channel.createdBy) {
    return { ok: true, channel: current };
  }

  if (channel.liveStatus === "ENDED") {
    return { ok: false, error: "This broadcast has ended.", status: 410 };
  }

  return { ok: false, error: "This broadcast is not active.", status: 410 };
}

export function overlayChatMeta(channel: OverlayBroadcastRow): {
  provider: LiveExternalProvider;
  externalId?: string;
} | null {
  const isExternal =
    channel.broadcastMode === "EXTERNAL" || channel.mediaSourceType === "EXTERNAL";
  if (!isExternal || !channel.externalProvider) return null;

  const provider = channel.externalProvider.toUpperCase() as LiveExternalProvider;
  if (
    (provider === "TWITCH" || provider === "CHZZK") &&
    channel.externalId
  ) {
    return { provider, externalId: channel.externalId };
  }
  return { provider };
}
