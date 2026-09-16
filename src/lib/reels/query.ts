import { unstable_cache } from "next/cache";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import type { ReelItem } from "@/lib/reels/types";
import { REELS_PAGE_SIZE } from "@/lib/reels/constants";
import { isHlsUrl } from "@/lib/reels/playback-url";
import { platformPostWhere } from "@/lib/post-scope";

const reelsMediaSelect = {
  id: true,
  url: true,
  type: true,
  width: true,
  height: true,
  duration: true,
  hlsUrl: true,
  posterUrl: true,
  priceKrw: true,
  order: true,
} as const;

function pickPrimaryVideo(
  media: {
    id: string;
    url: string;
    type: string;
    width: number | null;
    height: number | null;
    duration: number | null;
    hlsUrl?: string | null;
    posterUrl?: string | null;
    priceKrw: number;
    order: number;
  }[]
) {
  const videos = media
    .filter((m) => m.type === "VIDEO" && (m.priceKrw ?? 0) <= 0)
    .sort((a, b) => a.order - b.order);
  if (videos.length === 0) return null;

  const vertical = videos.find(
    (m) => m.width != null && m.height != null && m.height >= m.width
  );
  return vertical ?? videos[0] ?? null;
}

function mapReelRow(post: {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
  isNsfw: boolean;
  viewCount: number;
  author: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  media: {
    id: string;
    url: string;
    type: string;
    width: number | null;
    height: number | null;
    duration: number | null;
    hlsUrl?: string | null;
    posterUrl?: string | null;
    priceKrw: number;
    order: number;
  }[];
  _count: { likes: number; comments: number };
}): ReelItem | null {
  const video = pickPrimaryVideo(post.media);
  if (!video) return null;

  const storedHls = video.hlsUrl?.trim() || null;
  const hlsUrl = storedHls && isHlsUrl(storedHls) ? storedHls : isHlsUrl(video.url) ? video.url : null;

  return {
    id: `${post.id}:${video.id}`,
    postId: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    isNsfw: post.isNsfw,
    viewCount: post.viewCount,
    author: {
      id: post.author.id,
      username: post.author.username,
      name: post.author.name,
      image: post.author.image,
    },
    media: {
      id: video.id,
      url: video.url,
      hlsUrl,
      posterUrl: video.posterUrl?.trim() || null,
      width: video.width,
      height: video.height,
      duration: video.duration,
      priceKrw: video.priceKrw ?? 0,
    },
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    liked: false,
    starred: false,
  };
}

/**
 * Cursor is the last scanned post id. Over-fetch until we fill `limit` VIDEO items.
 * Sparse corpus: when the table is exhausted, wrap from the newest posts so
 * infinite scroll never ends (looping).
 */
export async function fetchReelsPage(cursor: string | null, limit = REELS_PAGE_SIZE) {
  const batchSize = Math.min(Math.max(limit * 4, 24), 80);
  const items: ReelItem[] = [];
  const pagePostIds = new Set<string>();
  let scanCursor = cursor;

  async function pull(fromCursor: string | null, maxGuards: number) {
    let localCursor = fromCursor;
    for (let guard = 0; guard < maxGuards && items.length < limit; guard++) {
      const posts = await db.post.findMany({
        take: batchSize,
        ...(localCursor ? { skip: 1, cursor: { id: localCursor } } : {}),
        orderBy: { createdAt: "desc" },
        where: {
          ...platformPostWhere,
          isNsfw: false,
          media: { some: { type: "VIDEO", priceKrw: 0 } },
        },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          isNsfw: true,
          viewCount: true,
          author: { select: userPublicSelect },
          media: {
            orderBy: { order: "asc" },
            select: reelsMediaSelect,
          },
          _count: { select: { likes: true, comments: true } },
        },
      });

      if (posts.length === 0) return { localCursor, hitEnd: true as const };

      for (const post of posts) {
        localCursor = post.id;
        scanCursor = post.id;
        if (pagePostIds.has(post.id)) continue;
        const reel = mapReelRow(post);
        if (!reel) continue;
        pagePostIds.add(post.id);
        items.push(reel);
        if (items.length >= limit) break;
      }

      if (posts.length < batchSize) return { localCursor, hitEnd: true as const };
    }
    return { localCursor, hitEnd: false as const };
  }

  const first = await pull(scanCursor, 6);

  // Wrap from head when corpus short / cursor past end
  if (items.length < limit) {
    await pull(null, 6);
  }

  // Hard loop in-page seed so page size is always met when any reel exists
  if (items.length > 0 && items.length < limit) {
    const seed = [...items];
    let i = 0;
    while (items.length < limit) {
      const base = seed[i % seed.length]!;
      items.push({ ...base, id: `${base.postId}:loop${items.length}` });
      i += 1;
      if (i > seed.length * limit) break;
    }
  }

  // Prefer advancing past the first-pass cursor; fall back to last item
  const nextCursor =
    items.length > 0
      ? scanCursor ?? first.localCursor ?? items[items.length - 1]!.postId
      : null;

  return {
    items: items.slice(0, limit),
    nextCursor,
  };
}

export function getCachedReelsPage(cursor: string | null, limit: number) {
  const cacheKey = cursor ?? "__head__";
  return unstable_cache(
    () => fetchReelsPage(cursor, limit),
    ["reels-page-v4-infinite-loop", cacheKey, String(limit)],
    { revalidate: 20, tags: [FEED_POSTS_CACHE_TAG] }
  )();
}
