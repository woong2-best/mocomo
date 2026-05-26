import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { CommentForm } from "@/components/post/comment-form";
import { auth } from "@/lib/auth";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userPublicSelect } from "@/lib/user-public-select";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  let post = null;
  try {
    post = await db.post.findUnique({
      where: { id },
      include: {
        author: true,
        community: true,
        media: true,
        comments: {
          where: { parentId: null },
          include: {
            author: { select: userPublicSelect },
            replies: { include: { author: { select: userPublicSelect } } },
          },
          orderBy: { createdAt: "asc" },
        },
        tags: { include: { tag: true } },
        _count: { select: { likes: true, votes: true } },
      },
    });
  } catch {
    post = null;
  }

  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Link href={`/u/${post.author.username}`}>
              <Avatar>
                <AvatarImage src={post.author.image} />
                <AvatarFallback>{post.author.username[0]}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link href={`/u/${post.author.username}`} className="hover:text-primary">
                <DisplayNameWithSupportTier
                  name={post.author.name || post.author.username}
                  tier={post.author.supportTierSent}
                  nameClassName="font-semibold"
                  compact
                />
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: ko })}
              </p>
            </div>
          </div>
          {post.title && <h1 className="text-xl font-bold">{post.title}</h1>}
          <p className="whitespace-pre-wrap">{post.content}</p>
          {post.media.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.id} src={m.url} alt="" className="rounded-lg max-w-full" />
          ))}
          <div className="flex gap-2 flex-wrap">
            {post.tags.map(({ tag }) => (
              <span key={tag.id} className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                #{tag.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <section id="comments" className="space-y-4">
        <h2 className="font-semibold">댓글 {post.comments.length}</h2>
        {session?.user && <CommentForm postId={post.id} />}
        {post.comments.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <DisplayNameWithSupportTier
                  name={c.author.name || c.author.username}
                  tier={c.author.supportTierSent}
                  nameClassName="font-medium text-sm"
                  compact
                />
              </div>
              <p className="text-sm mt-1">{c.content}</p>
              {c.replies.map((r) => (
                <div key={r.id} className="ml-6 mt-2 pl-4 border-l border-border">
                  <DisplayNameWithSupportTier
                    name={r.author.name || r.author.username}
                    tier={r.author.supportTierSent}
                    nameClassName="text-sm font-medium"
                    compact
                  />
                  <p className="text-sm">{r.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
