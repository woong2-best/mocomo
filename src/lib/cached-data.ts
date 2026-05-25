import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getTipRanking } from "@/actions/monetization";
import { getRankings } from "@/actions/events";
import { getAnimeCountByGenre } from "@/actions/anime";

export const getCachedFeedPosts = unstable_cache(
  async () =>
    db.post.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            image: true,
            level: true,
            cosplayerProfile: { select: { stageName: true } },
          },
        },
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
        orderBy: { hotScore: "desc" },
        include: {
          author: { select: { username: true, name: true, image: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      db.user.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          username: true,
          name: true,
          image: true,
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
    const [channels, upcoming] = await Promise.all([
      db.voiceChannel.findMany({
        where: { isLive: true },
        select: {
          id: true,
          name: true,
          createdBy: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 24,
      }),
      db.voiceChannel.findMany({
        where: { isLive: false },
        take: 6,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, _count: { select: { members: true } } },
      }),
    ]);
    const hosts =
      channels.length > 0
        ? await db.user.findMany({
            where: { id: { in: channels.map((c) => c.createdBy) } },
            select: { id: true, username: true, image: true },
          })
        : [];
    return { channels, upcoming, hosts };
  },
  ["live-channels"],
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
