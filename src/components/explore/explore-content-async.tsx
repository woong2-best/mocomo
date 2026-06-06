import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Radio } from "lucide-react";
import { getCachedLiveChannels } from "@/lib/cached-data";
import { Button } from "@/components/ui/button";
import { getCachedExploreData } from "@/lib/cached-data";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { SupportTierLevel } from "@prisma/client";
import { userDisplayName } from "@/lib/user-public-select";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export async function ExploreContentAsync() {
  type PostRow = {
    id: string;
    title: string | null;
    content: string;
    author: {
      username: string;
      name: string | null;
      image: string | null;
      supportTierSent: SupportTierLevel;
    };
    _count: { likes: number; comments: number };
  };
  type UserRow = {
    username: string;
    name: string | null;
    image: string | null;
    supportTierSent: SupportTierLevel;
    _count: { followers: number };
  };

  let trendingPosts: PostRow[] = [];
  let suggestedUsers: UserRow[] = [];
  let liveChannels: Awaited<ReturnType<typeof getCachedLiveChannels>>["channels"] = [];
  let dbOk = true;

  try {
    const [data, live] = await Promise.all([getCachedExploreData(), getCachedLiveChannels()]);
    trendingPosts = data.trendingPosts;
    suggestedUsers = data.suggestedUsers;
    liveChannels = live.channels;
  } catch {
    dbOk = false;
  }

  return (
    <>
      {!dbOk && (
        <p className="text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">
          DB 연결 후 탐색 목록이 표시됩니다.{" "}
          <Link href="/auth/signup" className="text-primary underline">
            회원가입
          </Link>
        </p>
      )}

      {isLiveFeatureEnabled() && liveChannels.length > 0 && (
        <section>
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Radio className="h-5 w-5 text-folk-terracotta" />
            지금 라이브
          </h2>
          <div className="flex flex-wrap gap-2">
            {liveChannels.map((ch) => (
              <Link
                key={ch.id}
                href={`/voice/${ch.id}`}
                className="text-sm px-3 py-2 rounded-xl border border-folk-terracotta/30 bg-folk-terracotta/5 hover:bg-folk-terracotta/10"
              >
                🔴 {ch.name} · {ch.viewerCount}명
              </Link>
            ))}
          </div>
          <Button asChild variant="ghost" className="mt-2 px-0">
            <Link href="/live">라이브 전체 보기</Link>
          </Button>
        </section>
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
                      <DisplayNameWithSupportTier
                        name={userDisplayName(p.author)}
                        tier={p.author.supportTierSent ?? "PEBBLE"}
                        nameClassName="font-medium"
                        compact
                      />
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
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/auth/signup">첫 번째 유저 되기</Link>
          </Button>
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
                    <DisplayNameWithSupportTier
                      name={u.name || u.username}
                      tier={u.supportTierSent ?? "PEBBLE"}
                      nameClassName="font-medium"
                      compact
                    />
                    <p className="text-sm text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
