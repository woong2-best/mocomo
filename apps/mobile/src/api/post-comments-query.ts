import type { QueryClient } from "@tanstack/react-query";
import { fetchPostComments, type CommentItem } from "@/api/social";

export type PostCommentsResponse = Awaited<ReturnType<typeof fetchPostComments>>;

export const postCommentsQueryKey = (postId: string) =>
  ["mobile-post-comments", postId] as const;

function normalizeComment(c: CommentItem & { likedByMe?: boolean; isPinned?: boolean }): CommentItem {
  return {
    ...c,
    liked: c.liked ?? c.likedByMe ?? false,
    likeCount: c.likeCount ?? 0,
    isPinned: Boolean(c.isPinned),
    createdAt:
      typeof c.createdAt === "string"
        ? c.createdAt
        : new Date(c.createdAt as unknown as string).toISOString(),
  };
}

export function parsePostComments(data: PostCommentsResponse | undefined): CommentItem[] {
  const pinned = ((data?.pinned ?? []) as CommentItem[]).map(normalizeComment);
  const top = ((data?.top ?? []) as CommentItem[]).map(normalizeComment);
  const rest = ((data?.comments ?? data?.items ?? []) as CommentItem[]).map(normalizeComment);
  const seen = new Set<string>();
  const out: CommentItem[] = [];
  for (const row of [...pinned, ...top, ...rest]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function parseCommentBuckets(data: PostCommentsResponse | undefined): {
  pinned: CommentItem[];
  top: CommentItem[];
  recent: CommentItem[];
} {
  const pinned = ((data?.pinned ?? []) as CommentItem[]).map(normalizeComment);
  const top = ((data?.top ?? []) as CommentItem[]).map(normalizeComment);
  const recent = ((data?.comments ?? []) as CommentItem[]).map(normalizeComment);
  if (pinned.length === 0 && top.length === 0 && recent.length === 0) {
    return {
      pinned: [],
      top: [],
      recent: ((data?.items ?? []) as CommentItem[]).map(normalizeComment),
    };
  }
  const skip = new Set([...pinned, ...top].map((c) => c.id));
  return { pinned, top, recent: recent.filter((c) => !skip.has(c.id)) };
}

export function mapCommentBuckets(
  data: PostCommentsResponse | undefined,
  mapper: (c: CommentItem) => CommentItem
): PostCommentsResponse {
  const buckets = parseCommentBuckets(data);
  return {
    ...(data ?? {}),
    pinned: buckets.pinned.map(mapper),
    top: buckets.top.map(mapper),
    comments: buckets.recent.map(mapper),
    items: undefined,
  };
}

export function withOptimisticReply(
  old: PostCommentsResponse | undefined,
  parentId: string,
  reply: CommentItem
): PostCommentsResponse {
  const bump = (c: CommentItem) =>
    c.id === parentId
      ? { ...c, replyCount: (c.replyCount ?? 0) + 1 }
      : c;
  const buckets = parseCommentBuckets(old);
  return {
    ...(old ?? {}),
    pinned: buckets.pinned.map(bump),
    top: buckets.top.map(bump),
    comments: buckets.recent.map(bump),
    items: undefined,
    total: (old?.total ?? 0) + 1,
  };
}

export function withOptimisticComment(
  old: PostCommentsResponse | undefined,
  comment: CommentItem,
  mode: "prepend" | "append"
): PostCommentsResponse {
  const buckets = parseCommentBuckets(old);
  const recent = buckets.recent.filter((c) => c.id !== comment.id);
  return {
    ...(old ?? {}),
    pinned: buckets.pinned,
    top: buckets.top,
    comments: mode === "append" ? [...recent, comment] : [comment, ...recent],
    items: undefined,
    total: (old?.total ?? buckets.pinned.length + buckets.top.length + recent.length) + 1,
  };
}

export function removeCommentFromBuckets(
  data: PostCommentsResponse | undefined,
  commentId: string
): PostCommentsResponse {
  const buckets = parseCommentBuckets(data);
  const drop = (list: CommentItem[]) => list.filter((c) => c.id !== commentId);
  const removed =
    buckets.pinned.some((c) => c.id === commentId) ||
    buckets.top.some((c) => c.id === commentId) ||
    buckets.recent.some((c) => c.id === commentId);
  return {
    ...(data ?? {}),
    pinned: drop(buckets.pinned),
    top: drop(buckets.top),
    comments: drop(buckets.recent),
    items: undefined,
    total: Math.max(0, (data?.total ?? 0) - (removed ? 1 : 0)),
  };
}

export function moveCommentPin(
  old: PostCommentsResponse | undefined,
  commentId: string,
  pinned: boolean
): PostCommentsResponse {
  const buckets = parseCommentBuckets(old);
  const all = [...buckets.pinned, ...buckets.top, ...buckets.recent];
  const target = all.find((c) => c.id === commentId);
  if (!target) return old ?? {};
  const restPinned = buckets.pinned.filter((c) => c.id !== commentId);
  const restTop = buckets.top.filter((c) => c.id !== commentId);
  const restRecent = buckets.recent.filter((c) => c.id !== commentId);
  if (pinned) {
    return {
      ...(old ?? {}),
      pinned: [...restPinned, { ...target, isPinned: true }].slice(0, 3),
      top: restTop,
      comments: restRecent,
      items: undefined,
    };
  }
  return {
    ...(old ?? {}),
    pinned: restPinned,
    top: restTop,
    comments: [{ ...target, isPinned: false }, ...restRecent],
    items: undefined,
  };
}

export function postCommentsQueryOptions(postId: string, isQna = false) {
  return {
    queryKey: postCommentsQueryKey(postId),
    queryFn: () => fetchPostComments(postId, isQna),
    staleTime: 120_000,
    gcTime: 10 * 60_000,
  };
}

/** Warm cache before the sheet opens (active reel / touch-down on comment icon). */
export function prefetchPostComments(queryClient: QueryClient, postId: string) {
  if (!postId) return;
  void queryClient.prefetchQuery(postCommentsQueryOptions(postId));
}
