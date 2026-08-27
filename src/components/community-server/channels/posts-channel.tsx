import { Suspense } from "react";
import { db } from "@/lib/db";
import { PostsChannelHeader } from "@/components/community-server/channels/posts-channel-header";
import { PostsChannelShell } from "@/components/community-server/channels/posts-channel-shell";
import { CommunityPostsBoard } from "@/components/community-server/channels/community-posts-board";
import { userPublicSelect, userDisplayName } from "@/lib/user-public-select";
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
      author: { select: userPublicSelect },
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
    authorUsername: p.author.username,
    authorName: userDisplayName(p.author),
  }));

  return (
    <PostsChannelShell communityId={communityId}>
      <PostsChannelHeader />
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted/40" />}>
          <CommunityPostsBoard posts={posts} communitySlug={communitySlug} />
        </Suspense>
      </div>
    </PostsChannelShell>
  );
}
