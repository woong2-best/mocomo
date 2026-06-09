import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Clock, Shuffle, Sparkles, Megaphone } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type AnimeLink = { slug: string; title: string; updatedAt?: Date };

export function AnimeHubWidgets({
  popular,
  recent,
}: {
  popular: AnimeLink[];
  recent: AnimeLink[];
}) {
  return (
    <div className="space-y-3">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            실시간 인기 글
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {popular.length === 0 ? (
            <p className="text-xs text-muted-foreground">아직 조회 기록이 없어요.</p>
          ) : (
            popular.map((a, i) => (
              <Link
                key={a.slug}
                href={`/anime/${a.slug}`}
                className="flex gap-2 text-sm hover:text-folk-cobalt min-w-0"
              >
                <span className="w-5 text-right font-semibold text-folk-cobalt tabular-nums shrink-0">{i + 1}</span>
                <span className="truncate">{a.title}</span>
              </Link>
            ))
          )}
          <Link href="/anime/popular" className="text-xs text-primary hover:underline inline-block pt-1">
            더보기
          </Link>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-folk-cobalt" />
            최근 수정 글
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0">
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">수정된 글가 없어요.</p>
          ) : (
            recent.map((a) => (
              <Link key={a.slug} href={`/anime/${a.slug}`} className="block text-sm truncate hover:text-folk-cobalt">
                {a.title}
              </Link>
            ))
          )}
          <Link href="/anime/recent" className="text-xs text-primary hover:underline inline-block pt-1">
            더보기
          </Link>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <Link
            href="/anime/random"
            className="flex items-center gap-2 text-sm font-medium hover:text-folk-cobalt"
          >
            <Shuffle className="h-4 w-4" />
            랜덤 글
          </Link>
          <Link
            href="/anime/newest"
            className="flex items-center gap-2 text-sm font-medium hover:text-folk-cobalt"
          >
            <Sparkles className="h-4 w-4" />
            신규 글
          </Link>
          <Link
            href="/anime/delete-requests"
            className="flex items-center gap-2 text-sm font-medium hover:text-folk-cobalt"
          >
            삭제 요청
          </Link>
        </CardContent>
      </Card>

      <AnimeHubAuthCard />
    </div>
  );
}

async function AnimeHubAuthCard() {
  const session = await auth();

  return (
    <Card className="rounded-2xl border-amber-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Megaphone className="h-4 w-4" />
          공지 · 계정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground">
        <p>애니 글는 로그인한 회원이 나무위키처럼 함께 편집합니다. 악의적 편집·스팸은 신고·운영진 조치 대상입니다.</p>
        {session?.user ? (
          <p className="text-foreground text-sm">
            <span className="font-medium">@{session.user.username}</span> 님으로 로그인됨
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link href="/auth/signin?callbackUrl=/anime">
              <Button size="sm" variant="default" className="rounded-xl h-8 text-xs">
                로그인
              </Button>
            </Link>
            <Link href="/auth/signup?callbackUrl=/anime">
              <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs">
                회원가입
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
