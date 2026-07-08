import { getCommunityBySlug } from "@/actions/community-hub";
import { PostCard } from "@/components/feed/post-card";
import { CommunityComposeButton } from "@/components/compose/community-compose-button";
import { MessageSquare } from "lucide-react";

export async function PostsChannelView({
  communitySlug,
  communityId,
  isMember,
  isOwner,
}: {
  communitySlug: string;
  communityId: string;
  isMember: boolean;
  isOwner: boolean;
}) {
  const data = await getCommunityBySlug(communitySlug);
  if (!data) return null;
  const { community } = data;

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
        {community.posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-3">
            <p className="text-muted-foreground text-sm">아직 글이 없어요.</p>
            {(isMember || isOwner) && (
              <CommunityComposeButton communityId={communityId} variant="secondary" />
            )}
          </div>
        ) : (
          community.posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
