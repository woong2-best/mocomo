import type {
  LiveBroadcastMode,
  LiveExternalProvider,
  LiveMediaSourceType,
  LiveStreamCategory,
  LiveStreamStatus,
  LiveVisibility,
  SupportTierLevel,
} from "@prisma/client";
import { db } from "@/lib/db";
import { ensureStringArray } from "@/lib/ensure-array";

export type SafeLiveChannelMeta = {
  id: string;
  name: string;
  isLive: boolean;
  liveStatus: LiveStreamStatus;
  createdBy: string;
  createdAt: Date;
  category: LiveStreamCategory;
  tags: string[];
  thumbnailUrl: string | null;
  description: string | null;
  donationGoalKrw: number | null;
  endedAt: Date | null;
  slowModeSeconds: number;
  chatBannedWords: string[];
  broadcastMode: LiveBroadcastMode;
  liveVisibility: LiveVisibility;
  minViewerTier: SupportTierLevel | null;
  donationAlertsOnStream: boolean;
  rtmpUrl: string | null;
  rtmpStreamKey: string | null;
  mediaSourceType: LiveMediaSourceType;
  externalProvider: LiveExternalProvider | null;
  externalId: string | null;
  externalWatchUrl: string | null;
};

function isSchemaMismatchError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /column|enum|does not exist|type .* does not exist|LiveStreamCategory|LiveBroadcastMode|LiveStreamStatus/i.test(
    msg
  );
}

const EXTENDED_SELECT = {
  id: true,
  name: true,
  isLive: true,
  liveStatus: true,
  createdBy: true,
  createdAt: true,
  category: true,
  tags: true,
  thumbnailUrl: true,
  description: true,
  donationGoalKrw: true,
  endedAt: true,
  slowModeSeconds: true,
  chatBannedWords: true,
  broadcastMode: true,
  liveVisibility: true,
  minViewerTier: true,
  donationAlertsOnStream: true,
  rtmpUrl: true,
  rtmpStreamKey: true,
  mediaSourceType: true,
  externalProvider: true,
  externalId: true,
  externalWatchUrl: true,
} as const;

const MINIMAL_SELECT = {
  id: true,
  name: true,
  isLive: true,
  createdBy: true,
  createdAt: true,
} as const;

function withLiveDefaults(
  ch: {
    id: string;
    name: string;
    isLive: boolean;
    createdBy: string;
    createdAt: Date;
  } & Partial<SafeLiveChannelMeta>
): SafeLiveChannelMeta {
  return {
    id: ch.id,
    name: ch.name,
    isLive: ch.isLive,
    createdBy: ch.createdBy,
    createdAt: ch.createdAt,
    liveStatus: ch.liveStatus ?? "LIVE",
    category: ch.category ?? "JUST_CHATTING",
    tags: ensureStringArray(ch.tags),
    thumbnailUrl: ch.thumbnailUrl ?? null,
    description: ch.description ?? null,
    donationGoalKrw: ch.donationGoalKrw ?? null,
    endedAt: ch.endedAt ?? null,
    slowModeSeconds: ch.slowModeSeconds ?? 0,
    chatBannedWords: ensureStringArray(ch.chatBannedWords),
    broadcastMode: ch.broadcastMode ?? "OBS",
    liveVisibility: ch.liveVisibility ?? "PUBLIC",
    minViewerTier: ch.minViewerTier ?? null,
    donationAlertsOnStream: ch.donationAlertsOnStream === true,
    rtmpUrl: ch.rtmpUrl ?? null,
    rtmpStreamKey: ch.rtmpStreamKey ?? null,
    mediaSourceType: ch.mediaSourceType ?? "FIRST_PARTY",
    externalProvider: ch.externalProvider ?? null,
    externalId: ch.externalId ?? null,
    externalWatchUrl: ch.externalWatchUrl ?? null,
  };
}

/** DB 컬럼이 일부만 있어도 스튜디오 페이지가 죽지 않게 로드 */
export async function fetchLiveChannelForStudio(
  channelId: string
): Promise<SafeLiveChannelMeta | null> {
  try {
    const ch = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: EXTENDED_SELECT,
    });
    if (!ch) return null;
    return withLiveDefaults(ch);
  } catch (e) {
    if (!isSchemaMismatchError(e)) throw e;
    console.warn("[fetchLiveChannelForStudio] extended select failed, using minimal", e);
  }

  try {
    const ch = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: MINIMAL_SELECT,
    });
    if (!ch) return null;
    return withLiveDefaults(ch);
  } catch (e) {
    console.error("[fetchLiveChannelForStudio] minimal select failed", e);
    return null;
  }
}

export async function fetchLiveTipsForChannel(
  hostUserId: string,
  since: Date
): Promise<{
  tipTotalKrw: number;
  tipRanking: { amount: number; username: string; tier: string }[];
}> {
  try {
    const [tipTotal, tipRanking] = await Promise.all([
      db.tip.aggregate({
        where: { receiverId: hostUserId, createdAt: { gte: since } },
        _sum: { amount: true },
      }),
      db.tip.groupBy({
        by: ["senderId"],
        where: { receiverId: hostUserId, createdAt: { gte: since } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
    ]);

    const senderIds = tipRanking.map((t) => t.senderId);
    const senders =
      senderIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, username: true, supportTierSent: true },
          })
        : [];
    const senderMap = Object.fromEntries(senders.map((s) => [s.id, s]));

    return {
      tipTotalKrw: tipTotal._sum.amount ?? 0,
      tipRanking: tipRanking.map((t) => ({
        amount: t._sum.amount ?? 0,
        username: senderMap[t.senderId]?.username ?? "?",
        tier: senderMap[t.senderId]?.supportTierSent ?? "SEED",
      })),
    };
  } catch (e) {
    console.warn("[fetchLiveTipsForChannel]", e);
    return { tipTotalKrw: 0, tipRanking: [] };
  }
}
