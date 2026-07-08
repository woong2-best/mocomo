import { getCommunityBySlug } from "@/actions/community-hub";
import { PostCard } from "@/components/feed/post-card";
import { Images } from "lucide-react";

export async function GalleryChannelView({ communitySlug }: { communitySlug: string }) {
  const data = await getCommunityBySlug(communitySlug);
  if (!data) return null;

  const imagePosts = data.community.posts.filter((p) =>
    p.media.some((m) => m.type === "IMAGE" || m.type === "image")
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold flex items-center gap-2">
          <Images className="h-5 w-5" />
          갤러리
        </h1>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {imagePosts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">이미지 게시글이 없습니다.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {imagePosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
