import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FeedPostCardInteractive } from "@/components/feed/feed-post-card-interactive";
import type { GridPost } from "@/components/feed/feed-post-card";
import { userPublicSelect } from "@/lib/user-public-select";

export async function StarContentAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/star");

  let posts: GridPost[] = [];
  try {
    const bookmarks = await db.bookmark.findMany({
      where: { userId: session.user.id },
      take: 50,
      include: {
        post: {
          include: {
            author: { select: userPublicSelect },
            anime: { select: { title: true, slug: true } },
            media: { take: 1, select: { url: true, type: true } },
            _count: { select: { likes: true, comments: true, votes: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    posts = bookmarks.map((b) => b.post);
  } catch {
    posts = [];
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {posts.length === 0 ? (
        <p className="col-span-full text-center text-muted-foreground py-12">
          STAR에 저장한 게시글이 없습니다. 피드에서 별 아이콘을 눌러 저장하세요.
        </p>
      ) : (
        posts.map((p) => (
          <FeedPostCardInteractive key={p.id} post={p} initialStarred={true} />
        ))
      )}
    </div>
  );
}
