import { db } from "@/lib/db";
import { SESSION_END_DATA } from "@/lib/live-broadcast/session-lifecycle";
import { teardownObsIngress } from "@/lib/obs-ingress-service";
import { revalidateLiveHubCache } from "@/lib/live-hub-data";

/** 방송 종료 없이 나간 뒤 DB에서 완전 종료까지 (24시간) */
export const ABANDONED_LIVE_END_MS = 24 * 60 * 60 * 1000;

/** 라이브 허브·팔로우 목록에서 숨길 호스트 부재 시간 */
export const LIVE_HUB_HOST_ABSENT_MS = 3 * 60 * 1000;

export function abandonedLiveEndCutoff(): Date {
  return new Date(Date.now() - ABANDONED_LIVE_END_MS);
}

export function liveHubHostPresentCutoff(): Date {
  return new Date(Date.now() - LIVE_HUB_HOST_ABSENT_MS);
}

async function fetchHostLastSeen(
  channels: { id: string; createdBy: string }[]
): Promise<Map<string, Date>> {
  if (channels.length === 0) return new Map();

  const members = await db.voiceMember.findMany({
    where: {
      OR: channels.map((c) => ({
        channelId: c.id,
        userId: c.createdBy,
      })),
    },
    select: { channelId: true, lastSeenAt: true },
  });

  return new Map(members.map((m) => [m.channelId, m.lastSeenAt]));
}

function hostLastSeenAt(
  channel: { id: string; createdBy: string; createdAt: Date },
  hostSeen: Map<string, Date>
): Date {
  return hostSeen.get(channel.id) ?? channel.createdAt;
}

/** 호스트가 24시간 이상 부재한 LIVE 방송 종료 */
export async function autoEndAbandonedLiveChannels(): Promise<number> {
  const cutoff = abandonedLiveEndCutoff();
  const live = await db.voiceChannel.findMany({
    where: { isLive: true, liveStatus: "LIVE" },
    select: {
      id: true,
      createdBy: true,
      createdAt: true,
      rtmpIngressId: true,
    },
  });
  if (live.length === 0) return 0;

  const hostSeen = await fetchHostLastSeen(live);
  const stale = live.filter((ch) => hostLastSeenAt(ch, hostSeen) < cutoff);
  if (stale.length === 0) return 0;

  for (const ch of stale) {
    await teardownObsIngress(ch.rtmpIngressId);
    await db.voiceChannel.update({
      where: { id: ch.id },
      data: SESSION_END_DATA,
    });
    await db.voiceMember.deleteMany({ where: { channelId: ch.id } });
    if (process.env.NODE_ENV !== "test") {
      console.info("[live-abandon] auto-ended", {
        channelId: ch.id,
        hostUserId: ch.createdBy,
      });
    }
  }

  revalidateLiveHubCache();
  return stale.length;
}

/** 허브·검색에 노출할 채널만 (호스트가 최근에 스튜디오에 있었던 방송) */
export async function filterChannelsWithPresentHost<
  T extends { id: string; createdBy: string; createdAt: Date },
>(channels: T[]): Promise<T[]> {
  if (channels.length === 0) return channels;

  const cutoff = liveHubHostPresentCutoff();
  const hostSeen = await fetchHostLastSeen(channels);
  return channels.filter((ch) => hostLastSeenAt(ch, hostSeen) >= cutoff);
}

/** @deprecated use autoEndAbandonedLiveChannels */
export async function pruneAbandonedLiveChannels() {
  await autoEndAbandonedLiveChannels();
}
