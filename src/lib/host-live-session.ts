import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";

/** 친목 단체 통화 채널은 OBS 라이브 방송과 구분 */
const hostBroadcastWhere = (hostUserId: string) => ({
  createdBy: hostUserId,
  isLive: true,
  liveStatus: "LIVE" as const,
  OR: [
    { linkedChatRoom: null },
    { linkedChatRoom: { is: { type: { not: "SOCIAL_GROUP" as const } } } },
  ],
});

/** 종료됐는데 isLive가 남았거나, 호스트가 떠난 고아 방송 정리 */
export async function closeStaleHostLiveChannels(hostUserId: string) {
  await db.voiceChannel.updateMany({
    where: {
      createdBy: hostUserId,
      isLive: true,
      OR: [{ liveStatus: "ENDED" }, { endedAt: { not: null } }],
    },
    data: {
      isLive: false,
      liveStatus: "ENDED",
      endedAt: new Date(),
    },
  });

  const hostAbsentCutoff = new Date(Date.now() - 90_000);
  const candidates = await db.voiceChannel.findMany({
    where: hostBroadcastWhere(hostUserId),
    select: { id: true },
  });

  for (const ch of candidates) {
    const hostSeen = await db.voiceMember.findFirst({
      where: {
        channelId: ch.id,
        userId: hostUserId,
        lastSeenAt: { gte: hostAbsentCutoff },
      },
      select: { userId: true },
    });
    if (hostSeen) continue;

    const anyActive = await db.voiceMember.count({
      where: { channelId: ch.id, lastSeenAt: { gte: liveViewerCutoff() } },
    });
    if (anyActive > 0) continue;

    await db.voiceChannel.update({
      where: { id: ch.id },
      data: {
        isLive: false,
        liveStatus: "ENDED",
        endedAt: new Date(),
        rtmpIngressId: null,
        rtmpUrl: null,
        rtmpStreamKey: null,
      },
    });
    await db.voiceMember.deleteMany({ where: { channelId: ch.id } });
  }
}

export async function findBlockingHostBroadcast(hostUserId: string) {
  await closeStaleHostLiveChannels(hostUserId);
  return db.voiceChannel.findFirst({
    where: hostBroadcastWhere(hostUserId),
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function endHostBroadcastChannel(channelId: string, hostUserId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel || channel.createdBy !== hostUserId) return false;

  await db.voiceChannel.update({
    where: { id: channelId },
    data: {
      isLive: false,
      liveStatus: "ENDED",
      endedAt: new Date(),
      rtmpIngressId: null,
      rtmpUrl: null,
      rtmpStreamKey: null,
    },
  });
  await db.voiceMember.deleteMany({ where: { channelId } });
  return true;
}
