import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PostCard } from "@/components/feed/post-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PenSquare } from "lucide-react";

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let community = null;
  try {
    community = await db.community.findUnique({
      where: { slug },
      include: {
        posts: {
          take: 30,
          orderBy: { hotScore: "desc" },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                image: true,
                level: true,
                supportTierSent: true,
                cosplayerProfile: { select: { stageName: true } },
              },
            },
            community: { select: { name: true, slug: true } },
            media: true,
            _count: { select: { likes: true, comments: true, votes: true } },
          },
        },
        children: true,
      },
    });
  } catch {
    community = null;
  }

  if (!community) notFound();

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
        <h1 className="text-2xl font-bold">{community.name}</h1>
        <p className="text-muted-foreground mt-2">{community.description}</p>
        <p className="text-sm text-muted-foreground mt-2">{community.memberCount} 멤버</p>
        <Link href={`/compose?community=${community.id}`} className="inline-block mt-4">
          <Button size="sm">
            <PenSquare className="h-4 w-4" />
            글쓰기
          </Button>
        </Link>
      </div>

      {community.children.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {community.children.map((sub) => (
            <Link
              key={sub.id}
              href={`/c/${sub.slug}`}
              className="text-sm px-3 py-1 rounded-full bg-muted hover:bg-primary/20"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {community.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
