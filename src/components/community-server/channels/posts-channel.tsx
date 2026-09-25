import { Suspense } from "react";
import { db } from "@/lib/db";
import { PostsChannelShell } from "@/components/community-server/channels/posts-channel-shell";
import { CommunityPostsBoard } from "@/components/community-server/channels/community-posts-board";
import { ANONYMOUS_AUTHOR_USERNAME, ANONYMOUS_DISPLAY_NAME } from "@/lib/anonymous-post";
import type { CommunityPostsBoardItem } from "@/lib/community-posts-board";

export async function PostsChannelView({
  communitySlug,
  communityId,
}: {
  communitySlug: string;
  communityId: string;
  isMember?: boolean;
  isOwner?: boolean;
}) {
  const rawPosts = await db.post.findMany({
    where: { communityId },
    take: 200,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      isPinned: true,
      viewCount: true,
      createdAt: true,
      _count: { select: { likes: true, comments: true } },
    },
  });

  const posts: CommunityPostsBoardItem[] = rawPosts.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    isPinned: p.isPinned,
    viewCount: p.viewCount,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
    createdAt: p.createdAt.toISOString(),
    authorUsername: ANONYMOUS_AUTHOR_USERNAME,
    authorName: ANONYMOUS_DISPLAY_NAME,
    isAnonymous: true,
  }));

  return (
    <PostsChannelShell communityId={communityId}>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted/40" />}>
        <CommunityPostsBoard posts={posts} communitySlug={communitySlug} />
      </Suspense>
    </PostsChannelShell>
  );
}
