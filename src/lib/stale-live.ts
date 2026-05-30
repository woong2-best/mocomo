import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";

/** 방송 중인데 시청자·호스트 모두 없는 고아 방송 종료 */
export async function pruneAbandonedLiveChannels() {
  const cutoff = liveViewerCutoff();
  const live = await db.voiceChannel.findMany({
    where: { isLive: true },
    select: { id: true, createdBy: true, createdAt: true },
  });
  if (live.length === 0) return;

  const activeCounts = await db.voiceMember.groupBy({
    by: ["channelId"],
    where: { lastSeenAt: { gte: cutoff } },
    _count: { _all: true },
  });
  const activeSet = new Set(activeCounts.map((r) => r.channelId));

  const staleIds = live
    .filter((ch) => {
      if (activeSet.has(ch.id)) return false;
      const graceMs = 15 * 60 * 1000;
      return Date.now() - ch.createdAt.getTime() > graceMs;
    })
    .map((ch) => ch.id);

  if (staleIds.length > 0) {
    await db.voiceChannel.updateMany({
      where: { id: { in: staleIds } },
      data: { isLive: false, liveStatus: "ENDED", endedAt: new Date() },
    });
  }
}
