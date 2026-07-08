import { db } from "@/lib/db";
import { PostCard } from "@/components/feed/post-card";
import { CommunityComposeButton } from "@/components/compose/community-compose-button";
import { MessageSquare } from "lucide-react";
import { postMediaPreview } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";

export async function PostsChannelView({
  communitySlug: _communitySlug,
  communityId,
  isMember,
  isOwner,
}: {
  communitySlug: string;
  communityId: string;
  isMember: boolean;
  isOwner: boolean;
}) {
  const posts = await db.post.findMany({
    where: { communityId },
    take: 20,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: userPublicSelect },
      community: { select: { name: true, slug: true } },
      media: postMediaPreview,
      _count: { select: { likes: true, comments: true, votes: true } },
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
        <h1 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          게시글
        </h1>
        {(isMember || isOwner) && <CommunityComposeButton communityId={communityId} />}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-3">
            <p className="text-muted-foreground text-sm">아직 글이 없어요.</p>
            {(isMember || isOwner) && (
              <CommunityComposeButton communityId={communityId} variant="secondary" />
            )}
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
