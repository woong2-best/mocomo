import { db } from "@/lib/db";
import { PostCard } from "@/components/feed/post-card";
import { Images } from "lucide-react";
import { postMediaPreview } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";

export async function GalleryChannelView({ communityId }: { communityId: string }) {
  const posts = await db.post.findMany({
    where: {
      communityId,
      media: { some: { type: "IMAGE" } },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: userPublicSelect },
      community: { select: { name: true, slug: true } },
      media: postMediaPreview,
      _count: { select: { likes: true, comments: true, votes: true } },
    },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold flex items-center gap-2">
          <Images className="h-5 w-5" />
          갤러리
        </h1>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {posts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">이미지 게시글이 없습니다.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
