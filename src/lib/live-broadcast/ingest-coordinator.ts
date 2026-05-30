import { db } from "@/lib/db";
import { findLiveChannelByObsStreamKey } from "@/lib/user-obs-stream-key";
import { releaseBroadcastSession } from "@/lib/live-broadcast/session-manager";

/** SRS on_publish — 송출 시작 시 세션 동기화 */
export async function onSrsPublish(streamKey: string) {
  const live = await findLiveChannelByObsStreamKey(streamKey);
  if (!live) return { allowed: false as const };

  try {
    await db.voiceChannel.update({
      where: { id: live.id },
      data: { isLive: true, liveStatus: "LIVE", rtmpStreamKey: streamKey },
    });
  } catch {
    return { allowed: false as const };
  }
  return { allowed: true as const, channelId: live.id };
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
