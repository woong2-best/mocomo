import { db } from "@/lib/db";
import { findLiveChannelByObsStreamKey } from "@/lib/user-obs-stream-key";
import { notifyFollowersOnLive } from "@/lib/live-notify";

/** SRS on_publish — 송출 시작 시 세션 동기화 */
export async function onSrsPublish(streamKey: string) {
  let channelId: string | null = null;
  const live = await findLiveChannelByObsStreamKey(streamKey);
  if (live) channelId = live.id;

  if (!channelId) {
    try {
      const user = await db.user.findFirst({
        where: { obsRtmpStreamKey: streamKey },
        select: { id: true },
      });
      if (user) {
        const ch = await db.voiceChannel.findFirst({
          where: {
            createdBy: user.id,
            liveStatus: { in: ["LIVE", "SCHEDULED"] },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (ch) channelId = ch.id;
      }
    } catch {
      /* obsRtmpStreamKey 미적용 */
    }
  }

  if (!channelId) return { allowed: true as const, channelId: null };

  try {
    const before = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: { isLive: true, name: true, createdBy: true },
    });
    await db.voiceChannel.update({
      where: { id: channelId },
      data: { isLive: true, liveStatus: "LIVE", rtmpStreamKey: streamKey },
    });
    if (before && !before.isLive) {
      void notifyFollowersOnLive(before.createdBy, channelId, before.name).catch(() => {});
    }
  } catch (e) {
    console.error("[onSrsPublish] channel update failed", channelId, e);
  }
  return { allowed: true as const, channelId };
}

/** SRS on_unpublish — OBS 방송 중지 시 오프라인 (방송 슬롯은 유지) */
export async function onSrsUnpublish(streamKey: string) {
  const live = await findLiveChannelByObsStreamKey(streamKey);
  if (!live) return;

  try {
    await db.voiceChannel.update({
      where: { id: live.id },
      data: { isLive: false },
    });
  } catch (e) {
    console.error("[onSrsUnpublish] channel update failed", live.id, e);
  }
}
