import Link from "next/link";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Compass, TrendingUp, Users, Tv, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export default async function ExplorePage() {
  type PostRow = {
    id: string;
    title: string | null;
    content: string;
    author: { username: string; name: string | null; image: string | null };
    _count: { likes: number; comments: number };
  };
  type UserRow = {
    username: string;
    name: string | null;
    image: string | null;
    _count: { followers: number };
  };

  let trendingPosts: PostRow[] = [];
  let suggestedUsers: UserRow[] = [];
  let dbOk = true;

  try {
    [trendingPosts, suggestedUsers] = await Promise.all([
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
          _count: { select: { followers: true } },
        },
      }),
    ]);
  } catch {
    dbOk = false;
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Compass className="h-7 w-7 text-primary" />
        탐색
      </h1>

      {!dbOk && (
        <p className="text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">
          DB 연결 후 탐색 목록이 표시됩니다.{" "}
          <Link href="/auth/signup" className="text-primary underline">
            회원가입
          </Link>
        </p>
      )}

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5" />
          인기 게시물
        </h2>
        {trendingPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">게시물 없음 — 가입 후 첫 글을 작성해 보세요</p>
        ) : (
          <div className="space-y-2">
            {trendingPosts.map((p) => (
              <Link key={p.id} href={`/post/${p.id}`}>
                <Card className="hover:bg-muted/30 rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{p.author.name || p.author.username}</span>
                      <span className="text-muted-foreground">@{p.author.username}</span>
                    </div>
                    <p className="mt-1 font-medium line-clamp-1">{p.title || p.content}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Users className="h-5 w-5" />
          새로운 유저
        </h2>
        {suggestedUsers.length === 0 ? (
          <Link href="/auth/signup">
            <Button variant="outline" className="rounded-xl">
              첫 번째 유저 되기
            </Button>
          </Link>
        ) : (
          <div className="space-y-2">
            {suggestedUsers.map((u) => (
              <Link key={u.username} href={`/u/${u.username}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 border border-border/50">
                  <Avatar>
                    <AvatarImage src={u.image ?? undefined} />
                    <AvatarFallback>{u.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{u.name || u.username}</p>
                    <p className="text-sm text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Tv className="h-5 w-5" />
          인기 애니
        </h2>
        <Link href="/anime" className="text-sm text-primary hover:underline">
          애니 허브 →
        </Link>
      </section>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Hash className="h-5 w-5" />
          커뮤니티
        </h2>
        <Link href="/communities" className="text-sm text-primary hover:underline">
          커뮤니티 보기 →
        </Link>
      </section>
    </div>
  );
}
