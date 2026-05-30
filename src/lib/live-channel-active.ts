import type { LiveStreamStatus } from "@prisma/client";
import { db } from "@/lib/db";

/** 라이브 허브·시청자 입장 — OBS 송출이 올라온 뒤만 */
export function isPubliclyLive(channel: {
  isLive: boolean;
  liveStatus: LiveStreamStatus;
}): boolean {
  if (channel.liveStatus === "ENDED") return false;
  return channel.isLive && channel.liveStatus === "LIVE";
}

/** 호스트 스튜디오 — OBS 대기·송출 중 (종료 전) */
export function isHostBroadcastRoom(channel: {
  liveStatus: LiveStreamStatus;
}): boolean {
  return channel.liveStatus === "LIVE" || channel.liveStatus === "SCHEDULED";
}

/** @deprecated — isPubliclyLive 사용 */
export function isBroadcastActive(channel: {
  isLive: boolean;
  liveStatus: LiveStreamStatus;
}): boolean {
  return isPubliclyLive(channel);
}

/** OBS webhook 전 isLive 복구 금지 — 송출 시작 시에만 LIVE */
export async function ensureChannelBroadcastActive(channelId: string) {
  const ch = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { isLive: true, liveStatus: true },
  });
  if (!ch) return false;
  return ch.isLive;
}
