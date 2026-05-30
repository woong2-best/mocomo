import { randomBytes } from "crypto";
import { db } from "@/lib/db";

import { liveHostBroadcastWhere } from "@/lib/live-broadcast/session-queries";
import { ensureChannelBroadcastActive, isBroadcastActive } from "@/lib/live-channel-active";

/** 계정당 고유 OBS 방송 키 (트위치/치지직 방식 — 방송마다 바뀌지 않음) */
export function mintUserObsStreamKey(userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
  const suffix = randomBytes(8).toString("hex");
  return `moco_${safe || "user"}_${suffix}`;
}

export async function getOrCreateUserObsStreamKey(
  userId: string,
  options?: { rotate?: boolean }
): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { obsRtmpStreamKey: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  if (!options?.rotate && user.obsRtmpStreamKey?.trim()) {
    return user.obsRtmpStreamKey.trim();
  }

  const streamKey = mintUserObsStreamKey(userId);
  await db.user.update({
    where: { id: userId },
    data: { obsRtmpStreamKey: streamKey },
  });
  return streamKey;
}

/** 라이브 방송 재생·웹훅용 — 호스트 계정 키 우선 */
export async function resolveObsStreamKeyForChannel(channelId: string): Promise<{
  streamKey: string | null;
  hostUserId: string | null;
}> {
  await ensureChannelBroadcastActive(channelId);

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, isLive: true, liveStatus: true, rtmpStreamKey: true },
  });
  if (!channel || !isBroadcastActive(channel)) {
    return { streamKey: null, hostUserId: null };
  }

  try {
    const host = await db.user.findUnique({
      where: { id: channel.createdBy },
      select: { obsRtmpStreamKey: true },
    });
    const key = host?.obsRtmpStreamKey?.trim() || channel.rtmpStreamKey?.trim() || null;
    return { streamKey: key, hostUserId: channel.createdBy };
  } catch {
    return {
      streamKey: channel.rtmpStreamKey?.trim() || null,
      hostUserId: channel.createdBy,
    };
  }
}

export async function findLiveChannelByObsStreamKey(stream: string) {
  const name = stream.trim().split("?")[0];
  if (!name) return null;

  try {
    const byUser = await db.user.findFirst({
      where: { obsRtmpStreamKey: name },
      select: { id: true },
    });
    if (byUser) {
      return db.voiceChannel.findFirst({
        where: {
          createdBy: byUser.id,
          liveStatus: { in: ["LIVE", "SCHEDULED"] },
          OR: [{ isLive: true }, { liveStatus: "LIVE" }],
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
    }
  } catch {
    /* obsRtmpStreamKey 컬럼 미적용 */
  }

  return db.voiceChannel.findFirst({
    where: { isLive: true, rtmpStreamKey: name },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
}
