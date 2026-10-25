import { db } from "@/lib/db";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { liveHostBroadcastWhere } from "@/lib/live-broadcast/session-queries";
import { filterChannelsWithPresentHost } from "@/lib/live-abandon";
import { avatarWatchPathForChannel, isAlwaysOnLiveChannel } from "@/lib/ai-live/official-channel-id";
import { resolveLiveStillThumb } from "@/lib/live-preview-thumb";

export type ProfileLiveBroadcast = {
  channelId: string;
  name: string;
  broadcastMode: string;
  thumbnailUrl: string | null;
  watchHref: string;
};

/** 프로필에 노출할 해당 유저의 현재 공개 라이브 (호스트 부재 방송 제외) */
export async function getProfileLiveBroadcast(
  userId: string
): Promise<ProfileLiveBroadcast | null> {
  if (!isLiveFeatureEnabled()) return null;

  const raw = await db.voiceChannel.findFirst({
    where: {
      ...liveHostBroadcastWhere(userId),
      broadcastMode: { in: ["BROWSER", "OBS"] },
    },
    select: {
      id: true,
      name: true,
      createdBy: true,
      createdAt: true,
      broadcastMode: true,
      thumbnailUrl: true,
      rtmpIngressId: true,
      externalProvider: true,
      externalId: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!raw) return null;

  const alwaysOn = isAlwaysOnLiveChannel(raw.id);
  if (!alwaysOn) {
    const present = await filterChannelsWithPresentHost([raw]);
    if (!present[0]) return null;
  }

  const ch = raw;
  return {
    channelId: ch.id,
    name: ch.name,
    broadcastMode: ch.broadcastMode,
    thumbnailUrl: resolveLiveStillThumb({
      thumbnailUrl: ch.thumbnailUrl,
      broadcastMode: ch.broadcastMode,
      externalProvider: ch.externalProvider,
      externalId: ch.externalId,
      rtmpIngressId: ch.rtmpIngressId,
    }),
    watchHref: avatarWatchPathForChannel(ch.id) ?? `/voice/${ch.id}`,
  };
}
