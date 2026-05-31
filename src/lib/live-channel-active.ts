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

/** 호스트 스튜디오 — 종료 전이면 항상 입장 (준비·송출) */
export function isHostBroadcastRoom(channel: {
  liveStatus?: LiveStreamStatus | null;
}): boolean {
  if (channel.liveStatus === "ENDED") return false;
  return (
    channel.liveStatus === "LIVE" ||
    channel.liveStatus === "SCHEDULED" ||
    channel.liveStatus == null
  );
}

/** 시청자 — 종료 전이면 대기실 입장 (방송 시작 전에도 플레이어 폴링) */
export function canViewerEnterLiveRoom(channel: {
  isLive: boolean;
  liveStatus?: LiveStreamStatus | null;
}): boolean {
  const status = channel.liveStatus ?? "SCHEDULED";
  if (status === "ENDED") return false;
  if (isPubliclyLive({ isLive: channel.isLive, liveStatus: status })) return true;
  return status === "SCHEDULED" || status === "LIVE";
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
