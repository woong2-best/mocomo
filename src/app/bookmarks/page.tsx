import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FeedPostCard, type GridPost } from "@/components/feed/feed-post-card";
import { userPublicSelect } from "@/lib/user-public-select";
import { Bookmark } from "lucide-react";

export default async function BookmarksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

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
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bookmark className="h-6 w-6" />
        북마크
      </h1>
      <p className="text-sm text-muted-foreground">저장한 게시글 · 애니 · 코스어</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {posts.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-12">저장한 항목이 없습니다.</p>
        ) : (
          posts.map((p) => <FeedPostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
