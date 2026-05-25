import Link from "next/link";
import { ANIME_GENRES } from "@/lib/anime-genres";
import { Card, CardContent } from "@/components/ui/card";
import { Tv } from "lucide-react";
import { genreToParam } from "@/lib/anime-genres";
import { AnimeAddButton } from "@/components/anime/anime-add-button";
import { getCachedAnimeGenreCounts } from "@/lib/cached-data";

export const revalidate = 120;

export default async function AnimeHubPage() {
  let counts: Awaited<ReturnType<typeof getCachedAnimeGenreCounts>> = [];
  try {
    counts = await getCachedAnimeGenreCounts();
  } catch {
    counts = [];
  }

  const countMap = Object.fromEntries(counts.map((c) => [c.genre, c._count.id]));

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tv className="h-7 w-7 text-neon-cyan" />
          애니덕질
        </h1>
        <AnimeAddButton />
      </div>

      <p className="text-sm text-muted-foreground">
        장르를 선택하면 해당 장르의 애니가 제목순(A→Z)으로 정렬됩니다. 유저가 직접 등록·설명·이미지를 추가할 수 있어요.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ANIME_GENRES.map((g) => {
          const count = countMap[g.id] ?? 0;
          return (
            <Link key={g.id} href={`/anime/list/${genreToParam(g.id)}`}>
              <Card className="h-full rounded-2xl hover:border-primary/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl" aria-hidden>
                      {g.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-lg">{g.label}</h2>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{g.description}</p>
                      <p className="text-xs text-neon-cyan mt-3">{count}개 작품</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/signin" className="text-primary hover:underline">
          로그인
        </Link>
        하면 애니를 직접 등록할 수 있습니다.
      </p>
    </div>
  );
}
