import type { QueryClient } from "@tanstack/react-query";
import { fetchPostComments, type CommentItem } from "@/api/social";

export type PostCommentsResponse = Awaited<ReturnType<typeof fetchPostComments>>;

export const postCommentsQueryKey = (postId: string) =>
  ["mobile-post-comments", postId] as const;

export function parsePostComments(data: PostCommentsResponse | undefined): CommentItem[] {
  const list = (data?.items ?? data?.comments ?? []) as CommentItem[];
  return list.map((c) => ({
    ...c,
    createdAt:
      typeof c.createdAt === "string"
        ? c.createdAt
        : new Date(c.createdAt as unknown as string).toISOString(),
  }));
}

export function postCommentsQueryOptions(postId: string) {
  return {
    queryKey: postCommentsQueryKey(postId),
    queryFn: () => fetchPostComments(postId),
    staleTime: 120_000,
    gcTime: 10 * 60_000,
  };
}

/** Warm cache before the sheet opens (active reel / touch-down on comment icon). */
export function prefetchPostComments(queryClient: QueryClient, postId: string) {
  if (!postId) return;
  void queryClient.prefetchQuery(postCommentsQueryOptions(postId));
}
