import { db } from "@/lib/db";
import type { GridPost } from "@/components/feed/feed-post-card";
import { postMediaPreview } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { redactAnonymousPostAuthors } from "@/lib/anonymous-post";
import { listingImages } from "@/lib/used-market";
import { wikiCoverDisplayUrl } from "@/lib/wiki-cover-url";

export type StarHubKind = "all" | "posts" | "qna" | "market" | "wiki";

export function isQnaStarPost(post: {
  communityId?: string | null;
  community?: { slug?: string | null } | null;
}): boolean {
  return Boolean(post.communityId || post.community?.slug);
}

const STAR_HUB_TAKE = 200;

export type StarHubCreator = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  count: number;
};

export type StarMarketListing = {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  thumbnailUrl: string | null;
  region: string | null;
  status: string;
  saleType: string;
  viewCount: number;
  favoriteCount: number;
};

export type StarWikiEntry = {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
  genre: string;
};

export type StarHubResult = {
  posts: GridPost[];
  creators: StarHubCreator[];
  total: number;
};

const starPostInclude = {
  author: { select: userPublicSelect },
  anime: { select: { title: true, slug: true } },
  community: {
    select: { slug: true, name: true, category: true, customCategoryLabel: true },
  },
  media: postMediaPreview,
  _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
} as const;

function postScope(kind: "posts" | "qna") {
  return kind === "qna" ? { communityId: { not: null } } : { communityId: null };
}

/** STAR hub — bookmark grid + followed-creator filter strip. */
export async function getStarHubForUser(
  userId: string,
  filterCreatorId?: string | null,
  kind: "posts" | "qna" = "posts"
): Promise<StarHubResult> {
  const bookmarks = await db.bookmark.findMany({
    where: { userId, post: postScope(kind) },
    take: STAR_HUB_TAKE,
    include: {
      post: { include: starPostInclude },
    },
    orderBy: { createdAt: "desc" },
  });

  const allPosts = bookmarks.map((b) => b.post) as GridPost[];
  const identifiablePosts = allPosts.filter((p) => !p.isAnonymous);

  const followingRows = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = new Set(followingRows.map((f) => f.followingId));

  const creatorMap = new Map<string, StarHubCreator>();
  for (const post of identifiablePosts) {
    const author = post.author;
    if (!author?.id || !followingIds.has(author.id)) continue;
    const prev = creatorMap.get(author.id);
    if (prev) {
      prev.count += 1;
    } else {
      creatorMap.set(author.id, {
        id: author.id,
        username: author.username,
        name: author.name ?? null,
        image: author.image ?? null,
        count: 1,
      });
    }
  }

  const creators = [...creatorMap.values()].sort((a, b) => b.count - a.count);

  const posts = filterCreatorId
    ? allPosts.filter((p) => p.author?.id === filterCreatorId)
    : allPosts;

  const gated = await attachWebPaidMediaPlayback(posts, userId);

  return {
    posts: redactAnonymousPostAuthors(gated, userId),
    creators,
    total: allPosts.length,
  };
}

/** @deprecated Use getStarHubForUser — kept for callers that only need posts. */
export async function getStarredPostsForUser(userId: string): Promise<GridPost[]> {
  const hub = await getStarHubForUser(userId);
  return hub.posts;
}

export async function listStarredMarketListings(userId: string): Promise<StarMarketListing[]> {
  try {
    const rows = await db.usedListingStar.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: STAR_HUB_TAKE,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            images: true,
            region: true,
            status: true,
            saleType: true,
            viewCount: true,
            _count: { select: { favorites: true } },
          },
        },
      },
    });
    return rows.map((row) => {
      const images = listingImages(row.listing.images);
      return {
        id: row.listing.id,
        title: row.listing.title,
        price: row.listing.price,
        currency: row.listing.currency,
        thumbnailUrl: images[0] ?? null,
        region: row.listing.region,
        status: row.listing.status,
        saleType: row.listing.saleType,
        viewCount: row.listing.viewCount,
        favoriteCount: row.listing._count.favorites,
      };
    });
  } catch (e) {
    console.error("[star-bookmarks] listStarredMarketListings", e);
    return [];
  }
}

export async function listStarredWikiEntries(userId: string): Promise<StarWikiEntry[]> {
  const rows = await db.animeStar.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: STAR_HUB_TAKE,
    include: {
      anime: {
        select: {
          id: true,
          slug: true,
          title: true,
          titleEn: true,
          coverUrl: true,
          genre: true,
        },
      },
    },
  });
  return rows.map((row) => ({
    id: row.anime.id,
    slug: row.anime.slug,
    title: row.anime.title,
    titleEn: row.anime.titleEn,
    coverUrl: wikiCoverDisplayUrl(row.anime.coverUrl),
    genre: row.anime.genre,
  }));
}

export async function toggleAnimeStarForUser(
  userId: string,
  animeId: string
): Promise<{ starred: boolean } | { error: string }> {
  const anime = await db.anime.findUnique({
    where: { id: animeId },
    select: { id: true },
  });
  if (!anime) return { error: "문서를 찾을 수 없습니다." };

  const existing = await db.animeStar.findUnique({
    where: { userId_animeId: { userId, animeId } },
  });
  if (existing) {
    await db.animeStar.delete({ where: { id: existing.id } });
    return { starred: false };
  }
  await db.animeStar.create({ data: { userId, animeId } });
  return { starred: true };
}

export async function clearStarBookmarks(
  userId: string,
  kind: StarHubKind | "all" = "all"
): Promise<number> {
  if (kind === "market") {
    const result = await db.usedListingStar.deleteMany({ where: { userId } });
    return result.count;
  }
  if (kind === "wiki") {
    const result = await db.animeStar.deleteMany({ where: { userId } });
    return result.count;
  }
  if (kind === "posts" || kind === "qna") {
    const result = await db.bookmark.deleteMany({
      where: { userId, post: postScope(kind) },
    });
    return result.count;
  }
  const [posts, market, wiki] = await Promise.all([
    db.bookmark.deleteMany({ where: { userId } }),
    db.usedListingStar.deleteMany({ where: { userId } }),
    db.animeStar.deleteMany({ where: { userId } }),
  ]);
  return posts.count + market.count + wiki.count;
}

export async function clearAllStarBookmarks(userId: string): Promise<number> {
  return clearStarBookmarks(userId, "all");
}
