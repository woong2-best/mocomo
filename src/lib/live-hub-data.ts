import { revalidateTag, unstable_cache } from "next/cache";
import type { LiveStreamCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";
import { getAuthUserId } from "@/lib/auth";
import {
  filterChannelsWithPresentHost,
} from "@/lib/live-abandon";

/** /live 허브·팔로우 라이브 목록 캐시 */
export const LIVE_HUB_CACHE_TAG = "live-hub";

export type LiveHubChannel = {
  id: string;
  name: string;
  createdBy: string;
  viewerCount: number;
  category: LiveStreamCategory;
  tags: string[];
  thumbnailUrl: string | null;
};

export type LiveHubHost = {
  id: string;
  username: string;
  image: string | null;
  supportTierSent: string;
  isPartner: boolean;
  followerCount: number;
};

export type LiveHubClip = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  videoUrl: string;
  isVertical: boolean;
  likeCount: number;
  viewCount: number;
  author: { username: string; image: string | null };
};

async function fetchHostsByIds(hostIds: string[]) {
  if (hostIds.length === 0) return [] as LiveHubHost[];
  const hosts = await db.user.findMany({
    where: { id: { in: hostIds } },
    select: {
      id: true,
      username: true,
      image: true,
      supportTierSent: true,
      streamerProfile: { select: { isPartner: true } },
      _count: { select: { followers: true } },
    },
  });
  return hosts.map((u) => ({
    id: u.id,
    username: u.username,
    image: u.image,
    supportTierSent: u.supportTierSent,
    isPartner: u.streamerProfile?.isPartner ?? false,
    followerCount: u._count.followers,
  })) satisfies LiveHubHost[];
}

async function fetchLiveHubChannels(category?: LiveStreamCategory) {
  const cutoff = liveViewerCutoff();
  const rawChannels = await db.voiceChannel.findMany({
    where: {
      isLive: true,
      liveStatus: "LIVE",
      ...(category ? { category } : {}),
    },
    select: {
      id: true,
      name: true,
      createdBy: true,
      createdAt: true,
      category: true,
      tags: true,
      thumbnailUrl: true,
    },
    orderBy: { createdAt: "desc" },
    take: 36,
  });

  const channels = await filterChannelsWithPresentHost(rawChannels);

  const channelIds = channels.map((c) => c.id);
  if (channelIds.length === 0) return [] as LiveHubChannel[];

  const viewerGroups = await db.voiceMember.groupBy({
    by: ["channelId"],
    where: { channelId: { in: channelIds }, lastSeenAt: { gte: cutoff } },
    _count: { _all: true },
  });
  const viewerMap = Object.fromEntries(viewerGroups.map((g) => [g.channelId, g._count._all]));
  return channels
    .map((c) => ({
      ...c,
      viewerCount: viewerMap[c.id] ?? 0,
    }))
    .sort((a, b) => b.viewerCount - a.viewerCount) as LiveHubChannel[];
}

async function fetchRecommendedStreamers() {
  const users = await db.user.findMany({
    where: { isBanned: false, streamerProfile: { isNot: null } },
    orderBy: { followers: { _count: "desc" } },
    take: 12,
    select: {
      id: true,
      username: true,
      image: true,
      supportTierSent: true,
      streamerProfile: { select: { isPartner: true } },
      _count: { select: { followers: true } },
    },
  });
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    image: u.image,
    supportTierSent: u.supportTierSent,
    isPartner: u.streamerProfile?.isPartner ?? false,
    followerCount: u._count.followers,
  })) satisfies LiveHubHost[];
}

async function fetchFollowedLive(userId: string) {
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
    take: 150,
  });
  const ids = following.map((f) => f.followingId);
  if (ids.length === 0) return [] as LiveHubChannel[];

  const cutoff = liveViewerCutoff();
  const rawChannels = await db.voiceChannel.findMany({
    where: { isLive: true, liveStatus: "LIVE", createdBy: { in: ids } },
    select: {
      id: true,
      name: true,
      createdBy: true,
      createdAt: true,
      category: true,
      tags: true,
      thumbnailUrl: true,
    },
    take: 12,
  });
  const channels = await filterChannelsWithPresentHost(rawChannels);
  const viewerGroups = await db.voiceMember.groupBy({
    by: ["channelId"],
    where: {
      channelId: { in: channels.map((c) => c.id) },
      lastSeenAt: { gte: cutoff },
    },
    _count: { _all: true },
  });
  const viewerMap = Object.fromEntries(viewerGroups.map((g) => [g.channelId, g._count._all]));
  return channels
    .map((c) => ({ ...c, viewerCount: viewerMap[c.id] ?? 0 }))
    .sort((a, b) => b.viewerCount - a.viewerCount) as LiveHubChannel[];
}

/** 카테고리별 실시간 방송 목록만 (탭 전환 시 이 부분만 다시 불러옴) */
export async function getLiveHubChannelFeed(category?: LiveStreamCategory) {
  const cacheKey = category ?? "all";
  const channels = await unstable_cache(() => fetchLiveHubChannels(category), ["live-hub-ch", cacheKey], {
    revalidate: 25,
    tags: [LIVE_HUB_CACHE_TAG],
  })();

  const hostIds = [...new Set(channels.map((c) => c.createdBy))];
  const hostKey = hostIds.slice().sort().join(",");
  const hosts =
    hostIds.length > 0
      ? await unstable_cache(() => fetchHostsByIds(hostIds), ["live-hub-hosts", hostKey], {
          revalidate: 60,
          tags: [LIVE_HUB_CACHE_TAG],
        })()
      : [];

  return { channels, hosts };
}

/** 클립·추천·팔로우 등 카테고리와 무관한 허브 데이터 */
export async function getLiveHubStaticData(userId?: string | null) {
  const [recommendedStreamers, followedLive, scheduledRaw] = await Promise.all([
    unstable_cache(fetchRecommendedStreamers, ["live-hub-rec"], { revalidate: 120 })(),
    userId
      ? unstable_cache(() => fetchFollowedLive(userId), ["live-hub-fl", userId], {
          revalidate: 25,
          tags: [LIVE_HUB_CACHE_TAG],
        })()
      : Promise.resolve([] as LiveHubChannel[]),
    unstable_cache(
      async () =>
        db.voiceChannel.findMany({
          where: { liveStatus: "SCHEDULED", scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: "asc" },
          take: 12,
          select: {
            id: true,
            name: true,
            createdBy: true,
            scheduledAt: true,
            category: true,
            thumbnailUrl: true,
          },
        }),
      ["live-hub-scheduled"],
      { revalidate: 60 }
    )(),
  ]);

  const followedHostIds = [...new Set(followedLive.map((c) => c.createdBy))];
  const followedHostKey = followedHostIds.slice().sort().join(",");
  const followedHosts =
    followedHostIds.length > 0
      ? await unstable_cache(() => fetchHostsByIds(followedHostIds), ["live-hub-fl-hosts", followedHostKey], {
          revalidate: 60,
        })()
      : [];

  const scheduledStreams = scheduledRaw.filter(
    (s): s is typeof s & { scheduledAt: Date } => s.scheduledAt != null
  );

  return {
    recommendedStreamers,
    followedLive,
    followedHosts,
    scheduledStreams,
  };
}

export async function getLiveHubData(category?: LiveStreamCategory) {
  const userId = await getAuthUserId();
  const [staticData, feed] = await Promise.all([
    getLiveHubStaticData(userId),
    getLiveHubChannelFeed(category),
  ]);
  const hosts = [...feed.hosts, ...staticData.followedHosts].filter(
    (h, i, arr) => arr.findIndex((x) => x.id === h.id) === i
  );
  return {
    channels: feed.channels,
    hosts,
    recommendedStreamers: staticData.recommendedStreamers,
    followedLive: staticData.followedLive,
    scheduledStreams: staticData.scheduledStreams,
  };
}

export function revalidateLiveHubCache() {
  revalidateTag(LIVE_HUB_CACHE_TAG);
}
