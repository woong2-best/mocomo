import type { SerializedComment } from "@/lib/comment-service";

export type PrefetchedCommentPage = {
  pinned?: SerializedComment[];
  comments?: SerializedComment[];
  nextCursor?: string | null;
  total?: number;
  postAuthorId?: string;
};

const TTL_MS = 90_000;
const cache = new Map<string, { data: PrefetchedCommentPage; fetchedAt: number }>();
const inflight = new Map<string, Promise<PrefetchedCommentPage | null>>();

function cacheKey(postId: string, sort: string) {
  return `${postId}:${sort}`;
}

export function getPrefetchedComments(
  postId: string,
  sort = "popular"
): PrefetchedCommentPage | null {
  const entry = cache.get(cacheKey(postId, sort));
  if (!entry || Date.now() - entry.fetchedAt > TTL_MS) return null;
  return entry.data;
}

export function setPrefetchedComments(
  postId: string,
  sort: string,
  data: PrefetchedCommentPage
) {
  cache.set(cacheKey(postId, sort), { data, fetchedAt: Date.now() });
}

export function invalidatePostComments(postId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${postId}:`)) cache.delete(key);
  }
}

export function prefetchPostComments(postId: string, sort = "popular") {
  if (!postId) return;
  const key = cacheKey(postId, sort);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return;
  if (inflight.has(key)) return;

  const promise = fetch(
    `/api/posts/${encodeURIComponent(postId)}/comments?sort=${encodeURIComponent(sort)}&limit=20`,
    { credentials: "include" }
  )
    .then(async (res) => {
      if (!res.ok) return null;
      const body = (await res.json()) as PrefetchedCommentPage;
      cache.set(key, { data: body, fetchedAt: Date.now() });
      return body;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
}
