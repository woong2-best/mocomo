import { unstable_cache } from "next/cache";
import type { LiveStreamCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";
import { getAuthUserId } from "@/lib/auth";

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

async function fetchLiveHubChannels(category?: LiveStreamCategory) {
  const cutoff = liveViewerCutoff();
  const [channels, viewerGroups] = await Promise.all([
    db.voiceChannel.findMany({
      where: {
        isLive: true,
        liveStatus: "LIVE",
        ...(category ? { category } : {}),
      },
      select: {
        id: true,
        name: true,
        createdBy: true,
        category: true,
        tags: true,
        thumbnailUrl: true,
      },
      orderBy: { createdAt: "desc" },
      take: 36,
    }),
    db.voiceMember.groupBy({
      by: ["channelId"],
      where: { lastSeenAt: { gte: cutoff } },
      _count: { _all: true },
    }),
  ]);
  const viewerMap = Object.fromEntries(viewerGroups.map((g) => [g.channelId, g._count._all]));
  return channels
    .map((c) => ({
      ...c,
      viewerCount: viewerMap[c.id] ?? 0,
    }))
    .filter((c) => c.viewerCount > 0) as LiveHubChannel[];
}

async function fetchRecommendedStreamers() {
  const users = await db.user.findMany({
    where: { isBanned: false },
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

async function fetchPopularClips(limit = 12) {
  const clips = await db.streamClip.findMany({
    orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      videoUrl: true,
      isVertical: true,
      likeCount: true,
      viewCount: true,
      author: { select: { username: true, image: true } },
    },
  });
  return clips satisfies LiveHubClip[];
}

async function fetchFollowedLive(userId: string) {
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
    take: 500,
  });
  const ids = following.map((f) => f.followingId);
  if (ids.length === 0) return [] as LiveHubChannel[];

  const cutoff = liveViewerCutoff();
  const channels = await db.voiceChannel.findMany({
    where: { isLive: true, liveStatus: "LIVE", createdBy: { in: ids } },
    select: {
      id: true,
      name: true,
      createdBy: true,
      category: true,
      tags: true,
      thumbnailUrl: true,
    },
    take: 12,
  });
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
    .filter((c) => c.viewerCount > 0) as LiveHubChannel[];
}

export async function getLiveHubData(category?: LiveStreamCategory) {
  const userId = await getAuthUserId();
  const cacheKey = category ?? "all";

  const [channels, recommendedStreamers, popularClips, followedLive] = await Promise.all([
    unstable_cache(() => fetchLiveHubChannels(category), ["live-hub-ch", cacheKey], {
      revalidate: 25,
    })(),
    unstable_cache(fetchRecommendedStreamers, ["live-hub-rec"], { revalidate: 120 })(),
    unstable_cache(() => fetchPopularClips(12), ["live-hub-clips"], { revalidate: 60 })(),
    userId
      ? unstable_cache(() => fetchFollowedLive(userId), ["live-hub-fl", userId], {
          revalidate: 25,
        })()
      : Promise.resolve([] as LiveHubChannel[]),
  ]);

  const hostIds = [
    ...new Set([...channels.map((c) => c.createdBy), ...followedLive.map((c) => c.createdBy)]),
  ];
  const hosts =
    hostIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: hostIds } },
          select: {
            id: true,
            username: true,
            image: true,
            supportTierSent: true,
            streamerProfile: { select: { isPartner: true } },
            _count: { select: { followers: true } },
          },
        })
      : [];

  const hostsMapped: LiveHubHost[] = hosts.map((u) => ({
    id: u.id,
    username: u.username,
    image: u.image,
    supportTierSent: u.supportTierSent,
    isPartner: u.streamerProfile?.isPartner ?? false,
    followerCount: u._count.followers,
  }));

  const scheduledRaw = await unstable_cache(
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
  )();
  const scheduledStreams = scheduledRaw.filter(
    (s): s is typeof s & { scheduledAt: Date } => s.scheduledAt != null
  );

  return {
    channels,
    hosts: hostsMapped,
    recommendedStreamers,
    popularClips,
    followedLive,
    scheduledStreams,
  };
}
