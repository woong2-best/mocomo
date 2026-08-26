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
  connectedStreamingAccountId: string | null;
};

export async function assertOverlayBroadcastAccess(
  channelId: string,
  tokenPayload: OverlayTokenPayload
):
  | { ok: true; channel: OverlayBroadcastRow }
  | { ok: false; error: string; status: number } {
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
      connectedStreamingAccountId: true,
    },
  });

  if (!channel) {
    return { ok: false, error: "방송을 찾을 수 없습니다.", status: 404 };
  }

  if (tokenPayload.broadcastSid != null) {
    const sid = Math.floor(channel.createdAt.getTime() / 1000);
    if (tokenPayload.broadcastSid !== sid) {
      return { ok: false, error: "이 방송 세션용 토큰이 아닙니다.", status: 401 };
    }
  }

  if (channel.liveStatus === "ENDED") {
    return { ok: false, error: "방송이 종료되었습니다.", status: 410 };
  }

  if (
    !canViewerEnterLiveRoom({
      isLive: channel.isLive,
      liveStatus: channel.liveStatus,
    })
  ) {
    return { ok: false, error: "방송이 활성 상태가 아닙니다.", status: 410 };
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
  if (provider === "TWITCH" && channel.externalId) {
    return { provider, externalId: channel.externalId };
  }
  return { provider };
}
