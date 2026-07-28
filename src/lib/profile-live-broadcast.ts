import { db } from "@/lib/db";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { liveHostBroadcastWhere } from "@/lib/live-broadcast/session-queries";
import { filterChannelsWithPresentHost } from "@/lib/live-abandon";

export type ProfileLiveBroadcast = {
  channelId: string;
  name: string;
  broadcastMode: string;
  thumbnailUrl: string | null;
};

/** 프로필에 노출할 해당 유저의 현재 공개 라이브 (호스트 부재 방송 제외) */
export async function getProfileLiveBroadcast(
  userId: string
): Promise<ProfileLiveBroadcast | null> {
  if (!isLiveFeatureEnabled()) return null;

  const raw = await db.voiceChannel.findFirst({
    where: liveHostBroadcastWhere(userId),
    select: {
      id: true,
      name: true,
      createdBy: true,
      createdAt: true,
      broadcastMode: true,
      thumbnailUrl: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!raw) return null;

  const present = await filterChannelsWithPresentHost([raw]);
  const ch = present[0];
  if (!ch) return null;

  return {
    channelId: ch.id,
    name: ch.name,
    broadcastMode: ch.broadcastMode,
    thumbnailUrl: ch.thumbnailUrl,
  };
}
