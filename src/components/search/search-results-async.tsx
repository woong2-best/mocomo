import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { SupportTierLevel } from "@prisma/client";

export async function SearchResultsAsync({ query }: { query: string }) {
  if (!query) return null;

  let users: { username: string; name: string | null; supportTierSent: SupportTierLevel }[] = [];
  let animes: { slug: string; title: string }[] = [];
  let posts: { id: string; content: string; title: string | null }[] = [];

  [users, animes, posts] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { username: true, name: true, supportTierSent: true },
    }),
    db.anime.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { titleEn: { contains: query, mode: "insensitive" } },
          { synopsis: { contains: query, mode: "insensitive" } },
          { studio: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
      select: { slug: true, title: true },
    }),
    db.post.findMany({
      where: {
        OR: [
          { content: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, content: true, title: true },
    }),
  ]);

  return (
    <>
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">유저 · 코스어</h2>
        {users.map((u) => (
          <Link key={u.username} href={`/u/${u.username}`} className="block text-sm py-1 hover:text-primary">
            <DisplayNameWithSupportTier
              name={
                <>
                  @{u.username}
                  {u.name && ` (${u.name})`}
                </>
              }
              tier={u.supportTierSent}
              compact
            />
          </Link>
        ))}
      </section>
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">애니</h2>
        {animes.map((a) => (
          <Link key={a.slug} href={`/anime/${a.slug}`} className="block text-sm py-1 hover:text-primary">
            {a.title}
          </Link>
        ))}
      </section>
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">게시글</h2>
        {posts.map((p) => (
          <Link key={p.id} href={`/post/${p.id}`}>
            <Card className="mb-2 hover:border-primary/30">
              <CardContent className="p-3 text-sm line-clamp-2">{p.title || p.content}</CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </>
  );
}
