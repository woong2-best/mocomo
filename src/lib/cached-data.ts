import { unstable_cache } from "next/cache";
import { liveViewerCutoff } from "@/lib/live-presence";
import { pruneAbandonedLiveChannels } from "@/lib/stale-live";
import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { getTipRanking } from "@/actions/monetization";
import { getRankings } from "@/actions/events";
import { getAnimeCountByGenre } from "@/actions/anime";

export const getCachedFeedPosts = unstable_cache(
  async () =>
    db.post.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: userPublicSelect },
        anime: { select: { title: true, slug: true } },
        media: true,
        _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
      },
    }),
  ["home-feed-posts"],
  { revalidate: 60 }
);

export const getCachedFeedAds = unstable_cache(
  async () => db.adSlot.findMany({ where: { active: true, isFeedAd: true }, take: 10 }),
  ["home-feed-ads"],
  { revalidate: 300 }
);

export const getCachedSidebarAds = unstable_cache(
  async () =>
    db.adSlot.findMany({
      where: { active: true, position: "right" },
      take: 2,
      select: { id: true, title: true, imageUrl: true, linkUrl: true, ctaLabel: true },
    }),
  ["sidebar-ads"],
  { revalidate: 300 }
);

export const getCachedPopularAnime = unstable_cache(
  async () =>
    db.anime.findMany({
      take: 5,
      orderBy: { followerCount: "desc" },
      select: { id: true, slug: true, title: true },
    }),
  ["sidebar-anime"],
  { revalidate: 120 }
);

export const getCachedSidebarTips = unstable_cache(
  async () => getTipRanking(5),
  ["sidebar-tips"],
  { revalidate: 120 }
);

export const getCachedExploreData = unstable_cache(
  async () => {
    const [trendingPosts, suggestedUsers] = await Promise.all([
      db.post.findMany({
        take: 8,
        orderBy: [{ hotScore: "desc" }, { createdAt: "desc" }],
        include: {
          author: { select: userPublicSelect },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      db.user.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          ...userPublicSelect,
          _count: { select: { followers: true } },
        },
      }),
    ]);
    return { trendingPosts, suggestedUsers };
  },
  ["explore-data"],
  { revalidate: 60 }
);

export const getCachedRankingsData = unstable_cache(
  async () => {
    const [posts, tips] = await Promise.all([getRankings("posts"), getTipRanking(10)]);
    return { posts, tips };
  },
  ["rankings-data"],
  { revalidate: 120 }
);

export const getCachedMarketProducts = unstable_cache(
  async () =>
    db.digitalProduct.findMany({
      take: 24,
      orderBy: { salesCount: "desc" },
      include: { seller: { select: { username: true } } },
    }),
  ["market-products"],
  { revalidate: 120 }
);

export const getCachedLiveChannels = unstable_cache(
  async () => {
    await pruneAbandonedLiveChannels();
    const cutoff = liveViewerCutoff();
    const [channels, viewerGroups] = await Promise.all([
      db.voiceChannel.findMany({
        where: { isLive: true },
        select: {
          id: true,
          name: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 24,
      }),
      db.voiceMember.groupBy({
        by: ["channelId"],
        where: { lastSeenAt: { gte: cutoff } },
        _count: { _all: true },
      }),
    ]);
    const viewerMap = Object.fromEntries(
      viewerGroups.map((g) => [g.channelId, g._count._all])
    );
    const channelsWithViewers = channels
      .map((c) => ({
        ...c,
        viewerCount: viewerMap[c.id] ?? 0,
      }))
      .filter((c) => c.viewerCount > 0);
    const hosts =
      channelsWithViewers.length > 0
        ? await db.user.findMany({
            where: { id: { in: channelsWithViewers.map((c) => c.createdBy) } },
            select: { id: true, username: true, image: true, supportTierSent: true },
          })
        : [];
    return { channels: channelsWithViewers, hosts };
  },
  ["live-channels-v2"],
  { revalidate: 30 }
);

export const getCachedVoiceChannels = unstable_cache(
  async () =>
    db.voiceChannel.findMany({
      where: { isLive: true },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ["voice-channels"],
  { revalidate: 30 }
);

export const getCachedAnimeGenreCounts = unstable_cache(
  async () => getAnimeCountByGenre(),
  ["anime-genre-counts"],
  { revalidate: 120 }
);
