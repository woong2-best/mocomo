import { db } from "@/lib/db";
import { findLiveChannelByObsStreamKey } from "@/lib/user-obs-stream-key";
import { releaseBroadcastSession } from "@/lib/live-broadcast/session-manager";

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
    await db.voiceChannel.update({
      where: { id: channelId },
      data: { isLive: true, liveStatus: "LIVE", rtmpStreamKey: streamKey },
    });
  } catch (e) {
    console.error("[onSrsPublish] channel update failed", channelId, e);
  }
  return { allowed: true as const, channelId };
}

/** SRS on_unpublish — OBS 종료 시 세션 종료 */
export async function onSrsUnpublish(streamKey: string) {
  const live = await findLiveChannelByObsStreamKey(streamKey);
  if (!live) return;

  const ch = await db.voiceChannel.findUnique({
    where: { id: live.id },
    select: { createdBy: true },
  });
  if (ch) {
    await releaseBroadcastSession(live.id, ch.createdBy, "OBS_UNPUBLISH");
  }
}
