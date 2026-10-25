import { unstable_cache } from "next/cache";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import type { ReelItem } from "@/lib/reels/types";
import { mapReelCollaborators } from "@/lib/reels/collaborators";
import { REELS_PAGE_SIZE } from "@/lib/reels/constants";
import { isHlsUrl } from "@/lib/reels/playback-url";
import { reelNotePages } from "@/lib/reels/text-pages";
import { platformPostWhere } from "@/lib/post-scope";
import { blockedIdList } from "@/lib/user-block";
import { postCollaboratorsHeaderInclude } from "@/lib/post-collaborator-select";
import { canViewLockedAccountContent } from "@/lib/posts-lock";
import { canViewNsfwResource } from "@/lib/nsfw-viewer-access";

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

function isUnpaidReelMedia(m: { type: string; priceKrw: number; url?: string }) {
  if ((m.priceKrw ?? 0) > 0) return false;
  if (!m.url?.trim()) return false;
  return m.type === "VIDEO" || m.type === "IMAGE";
}

function blankNoteMedia(id: string): ReelItem["media"] {
  return {
    id,
    url: "",
    hlsUrl: null,
    posterUrl: null,
    width: null,
    height: null,
    duration: null,
    priceKrw: 0,
  };
}

function mapReelSlides(
  post: {
  id: string;
  title: string | null;
  content: string;
  createdAt: Date;
  isNsfw: boolean;
  isAnonymous?: boolean | null;
  viewCount: number;
  author: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
  collaborators?: {
    user?: {
      id: string;
      username: string;
      name?: string | null;
      image: string | null;
    } | null;
  }[];
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
  _count: { likes: number; comments: number; reposts: number };
},
  runId: string
): ReelItem[] {
  const author = {
    id: post.author.id,
    username: post.author.username,
    name: post.author.name,
    image: post.author.image,
  };
  const collaborators = post.isAnonymous
    ? []
    : mapReelCollaborators(post.author.id, post.collaborators);
  const shared = {
    postId: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    isNsfw: post.isNsfw,
    viewCount: post.viewCount,
    author,
    collaborators,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    repostCount: post._count.reposts,
    liked: false,
    starred: false,
    reposted: false,
    runId,
  };

  const slides: ReelItem[] = [];
  const mediaItems = post.media.filter(isUnpaidReelMedia).sort((a, b) => a.order - b.order);
  for (const media of mediaItems) {
    const storedHls = media.hlsUrl?.trim() || null;
    const hlsUrl =
      storedHls && isHlsUrl(storedHls) ? storedHls : isHlsUrl(media.url) ? media.url : null;
    const mediaType = media.type === "IMAGE" ? "IMAGE" : "VIDEO";
    slides.push({
      ...shared,
      id: `${post.id}:${media.id}`,
      mediaType,
      media: {
        id: media.id,
        url: media.url,
        hlsUrl: mediaType === "IMAGE" ? null : hlsUrl,
        posterUrl: media.posterUrl?.trim() || (mediaType === "IMAGE" ? media.url : null),
        width: media.width,
        height: media.height,
        duration: mediaType === "IMAGE" ? null : media.duration,
        priceKrw: media.priceKrw ?? 0,
      },
    });
  }

  reelNotePages(post.title, post.content).forEach((noteText, index) => {
    const id = `${post.id}:note:${index}`;
    slides.push({
      ...shared,
      id,
      mediaType: "NOTE",
      noteText,
      media: blankNoteMedia(id),
    });
  });

  return slides;
}

/**
 * Cursor is the last scanned post id. Over-fetch until we fill `limit` reel items.
 * Sparse corpus: when the table is exhausted, wrap from the newest posts so
 * infinite scroll never ends (looping).
 */
const reelsPostSelect = {
  id: true,
  title: true,
  content: true,
  createdAt: true,
  isNsfw: true,
  isAnonymous: true,
  viewCount: true,
  removedAt: true,
  communityId: true,
  author: { select: userPublicSelect },
  collaborators: postCollaboratorsHeaderInclude,
  media: {
    orderBy: { order: "asc" as const },
    select: reelsMediaSelect,
  },
  _count: { select: { likes: true, comments: true, reposts: true } },
};

type BuiltGroup = { runId: string; postId: string; slides: ReelItem[] };

function withRun(slides: ReelItem[], runId: string): ReelItem[] {
  return slides.map((slide) => ({ ...slide, runId }));
}

export async function fetchReelsPage(
  cursor: string | null,
  limit = REELS_PAGE_SIZE,
  excludeAuthorIds?: Set<string>
) {
  const batchSize = Math.min(Math.max(limit * 4, 24), 80);
  const groups: BuiltGroup[] = [];
  const pagePostIds = new Set<string>();
  let scanCursor = cursor;
  const excludeAuthors = blockedIdList(excludeAuthorIds ?? new Set());

  async function pull(fromCursor: string | null, maxGuards: number) {
    let localCursor = fromCursor;
    for (let guard = 0; guard < maxGuards && groups.length < limit; guard++) {
      const posts = await db.post.findMany({
        take: batchSize,
        ...(localCursor ? { skip: 1, cursor: { id: localCursor } } : {}),
        orderBy: { createdAt: "desc" },
        where: {
          ...platformPostWhere,
          isNsfw: false,
          ...(excludeAuthors.length ? { authorId: { notIn: excludeAuthors } } : {}),
          OR: [
            { media: { some: { type: { in: ["VIDEO", "IMAGE"] }, priceKrw: 0 } } },
            { content: { not: "" } },
            { AND: [{ title: { not: null } }, { title: { not: "" } }] },
          ],
        },
        select: reelsPostSelect,
      });

      if (posts.length === 0) return { localCursor, hitEnd: true as const };

      for (const post of posts) {
        localCursor = post.id;
        scanCursor = post.id;
        if (pagePostIds.has(post.id)) continue;
        const slides = mapReelSlides(post, post.id);
        if (slides.length === 0) continue;
        pagePostIds.add(post.id);
        groups.push({ runId: post.id, postId: post.id, slides });
        if (groups.length >= limit) break;
      }

      if (posts.length < batchSize) return { localCursor, hitEnd: true as const };
    }
    return { localCursor, hitEnd: false as const };
  }

  const first = await pull(scanCursor, 6);

  // Wrap from head when corpus short / cursor past end
  if (groups.length < limit) {
    await pull(null, 6);
  }

  // Hard loop in-page seed so page size is always met when any reel exists.
  // Each loop is its own sideways run so it does not merge into the original post.
  if (groups.length > 0 && groups.length < limit) {
    const seed = [...groups];
    let i = 0;
    while (groups.length < limit) {
      const base = seed[i % seed.length]!;
      const n = groups.length;
      const runId = `${base.postId}:loop${n}`;
      groups.push({
        runId,
        postId: base.postId,
        slides: base.slides.map((slide) => ({
          ...slide,
          id: `${slide.id}:loop${n}`,
          runId,
        })),
      });
      i += 1;
      if (i > seed.length * limit) break;
    }
  }

  const items = groups.flatMap((group) => group.slides);
  const nextCursor =
    groups.length > 0
      ? scanCursor ?? first.localCursor ?? groups[groups.length - 1]!.postId
      : null;

  return { items, nextCursor };
}

/** One post, pinned at the front of a deep link. Null when the viewer must not see it. */
export async function fetchReelSlidesForPost(
  postId: string,
  viewerId?: string | null
): Promise<ReelItem[] | null> {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: reelsPostSelect,
  });
  if (!post || post.removedAt || post.communityId || post.author.deletedAt) return null;
  if (
    post.isNsfw &&
    !(await canViewNsfwResource({
      viewerId: viewerId ?? undefined,
      ownerId: post.author.id,
      isNsfw: true,
    }))
  ) {
    return null;
  }
  const allowed = await canViewLockedAccountContent(
    post.author.id,
    viewerId,
    post.author.postsLocked
  );
  if (!allowed) return null;
  const slides = withRun(mapReelSlides(post, post.id), post.id);
  return slides.length > 0 ? slides : null;
}

export function getCachedReelsPage(cursor: string | null, limit: number) {
  const cacheKey = cursor ?? "__head__";
  return unstable_cache(
    () => fetchReelsPage(cursor, limit),
    ["reels-page-v9-note-fill", cacheKey, String(limit)],
    { revalidate: 20, tags: [FEED_POSTS_CACHE_TAG] }
  )();
}
