import Link from "next/link";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Compass, TrendingUp, Users, Tv, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export default async function ExplorePage() {
  const [trendingPosts, suggestedUsers, popularAnime, communities] = await Promise.all([
    db.post.findMany({
      take: 8,
      orderBy: { hotScore: "desc" },
      include: {
        author: { select: { username: true, name: true, image: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    db.user.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        username: true,
        name: true,
        image: true,
        profile: { select: { bio: true } },
        _count: { select: { followers: true } },
      },
    }),
    db.anime.findMany({
      take: 6,
      orderBy: { followerCount: "desc" },
      select: { slug: true, title: true, coverUrl: true, genre: true },
    }),
    db.community.findMany({
      take: 6,
      orderBy: { memberCount: "desc" },
      select: { slug: true, name: true, description: true, memberCount: true },
    }),
  ]);

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Compass className="h-7 w-7 text-primary" />
        탐색
      </h1>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5" />
          인기 게시물
        </h2>
        <div className="space-y-2">
          {trendingPosts.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`}>
              <Card className="hover:bg-muted/30 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{p.author.name || p.author.username}</span>
                    <span className="text-muted-foreground">@{p.author.username}</span>
                    <span className="text-muted-foreground text-xs">
                      · {formatDistanceToNow(p.createdAt, { addSuffix: true, locale: ko })}
                    </span>
                  </div>
                  <p className="mt-1 font-medium line-clamp-1">{p.title || p.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ♥ {p._count.likes} · 💬 {p._count.comments}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Users className="h-5 w-5" />
          새로운 유저
        </h2>
        <div className="space-y-2">
          {suggestedUsers.map((u) => (
            <Link key={u.username} href={`/u/${u.username}`}>
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 border border-border/50">
                <Avatar>
                  <AvatarImage src={u.image ?? undefined} />
                  <AvatarFallback>{u.username[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium">{u.name || u.username}</p>
                  <p className="text-sm text-muted-foreground">@{u.username} · {u._count.followers} 팔로워</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Tv className="h-5 w-5" />
          인기 애니
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {popularAnime.map((a) => (
            <Link key={a.slug} href={`/anime/${a.slug}`}>
              <Card className="overflow-hidden rounded-xl hover:border-primary/40 h-full">
                {a.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt={a.title} className="aspect-[3/4] object-cover w-full" />
                )}
                <CardContent className="p-2">
                  <p className="text-sm font-medium line-clamp-2">{a.title}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <Link href="/anime" className="text-sm text-primary mt-2 inline-block hover:underline">
          애니 전체 보기 →
        </Link>
      </section>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Hash className="h-5 w-5" />
          인기 커뮤니티
        </h2>
        <div className="space-y-2">
          {communities.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`}>
              <Card className="rounded-xl hover:bg-muted/30">
                <CardContent className="p-4">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                  <p className="text-xs text-primary mt-1">{c.memberCount}명</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <Link href="/communities" className="text-sm text-primary mt-2 inline-block hover:underline">
          커뮤니티 더보기 →
        </Link>
      </section>
    </div>
  );
}
