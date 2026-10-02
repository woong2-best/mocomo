import { db } from "@/lib/db";
import { canViewerEnterLiveRoom } from "@/lib/live-channel-active";
import type { OverlayTokenPayload } from "@/lib/live-external/overlay-token";
import type { LiveExternalProvider } from "@/lib/live-external/types";

export type OverlayBroadcastRow = {
  createdAt: Date;
  isLive: boolean;
  liveStatus: string;
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

export async function assertOverlayBroadcastAccess(
  channelId: string,
  tokenPayload: OverlayTokenPayload
): Promise<OverlayBroadcastAccess> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdAt: true,
      isLive: true,
      liveStatus: true,
      broadcastMode: true,
      mediaSourceType: true,
      externalProvider: true,
      externalId: true,
      externalChannelId: true,
      connectedStreamingAccountId: true,
    },
  });

  if (!channel) {
    return { ok: false, error: "Stream not found.", status: 404 };
  }

  if (tokenPayload.broadcastSid != null) {
    const sid = Math.floor(channel.createdAt.getTime() / 1000);
    if (tokenPayload.broadcastSid !== sid) {
      return { ok: false, error: "This token is not for this broadcast session.", status: 401 };
    }
  }

  if (channel.liveStatus === "ENDED") {
    return { ok: false, error: "This broadcast has ended.", status: 410 };
  }

  if (
    !canViewerEnterLiveRoom({
      isLive: channel.isLive,
      liveStatus: channel.liveStatus,
    })
  ) {
    return { ok: false, error: "This broadcast is not active.", status: 410 };
  }

  return { ok: true, channel };
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
