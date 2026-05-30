import type { LiveStreamStatus } from "@prisma/client";
import { db } from "@/lib/db";

export function isBroadcastActive(
  channel: { isLive: boolean; liveStatus: LiveStreamStatus }
): boolean {
  if (channel.liveStatus === "ENDED") return false;
  return channel.isLive || channel.liveStatus === "LIVE";
}

/** isLive 플래그만 꺼진 고아 상태 복구 (liveStatus는 LIVE) */
export async function ensureChannelBroadcastActive(channelId: string) {
  const ch = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { isLive: true, liveStatus: true, createdBy: true },
  });
  if (!ch) return false;
  if (ch.isLive || ch.liveStatus !== "LIVE") return ch.isLive;
  await db.voiceChannel.update({
    where: { id: channelId },
    data: { isLive: true },
  });
  return true;
}
