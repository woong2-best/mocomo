import { db } from "@/lib/db";
import { CommunityPostCard } from "@/components/community-server/community-post-card";
import { postMediaPreview } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";
import { PostsChannelHeader, PostsChannelEmptyCta } from "@/components/community-server/channels/posts-channel-header";
import { getAuthUserId } from "@/lib/auth";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";

export async function PostsChannelView({
  communitySlug: _communitySlug,
  communityId,
}: {
  communitySlug: string;
  communityId: string;
  isMember?: boolean;
  isOwner?: boolean;
}) {
  const [viewerId, rawPosts] = await Promise.all([
    getAuthUserId(),
    db.post.findMany({
      where: { communityId },
      take: 20,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        author: { select: userPublicSelect },
        community: { select: { name: true, slug: true } },
        media: postMediaPreview,
        _count: { select: { likes: true, comments: true, votes: true, media: true } },
      },
    }),
  ]);
  const posts = await attachWebPaidMediaPlayback(
    rawPosts.map((p) => ({ ...p, authorId: p.authorId ?? p.author.id })),
    viewerId
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <PostsChannelHeader communityId={communityId} />
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-3">
            <p className="text-muted-foreground text-sm">아직 글이 없어요.</p>
            <PostsChannelEmptyCta communityId={communityId} />
          </div>
        ) : (
          posts.map((post) => (
            <CommunityPostCard key={post.id} post={post} communityId={communityId} />
          ))
        )}
      </div>
    </div>
  );
}
