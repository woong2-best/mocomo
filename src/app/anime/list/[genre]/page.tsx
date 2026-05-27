import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { genreFromParam, getGenreInfo } from "@/lib/anime-genres";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Plus } from "lucide-react";

export default async function AnimeGenreListPage({
  params,
}: {
  params: Promise<{ genre: string }>;
}) {
  const { genre: genreParam } = await params;
  const genre = genreFromParam(genreParam);
  if (!genre) notFound();

  const info = getGenreInfo(genre);
  const session = await auth();

  type AnimeRow = {
    id: string;
    slug: string;
    title: string;
    titleEn: string | null;
    coverUrl: string | null;
    creator: { username: string };
  };

  let animes: AnimeRow[] = [];
  try {
    animes = await db.anime.findMany({
      where: { genre },
      take: 120,
      orderBy: { title: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        coverUrl: true,
        creator: { select: { username: true } },
      },
    });
  } catch {
    animes = [];
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/anime">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            장르 목록
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl" aria-hidden>
              {info.emoji}
            </span>
            {info.label}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">제목순 정렬 (A → Z) · {animes.length}개</p>
        </div>
        <Link href={session?.user ? `/anime/new?genre=${genreParam}` : `/auth/signin?callbackUrl=${encodeURIComponent(`/anime/new?genre=${genreParam}`)}`}>
          <Button size="sm" className="gap-1" variant={session?.user ? "default" : "outline"}>
            <Plus className="h-4 w-4" />
            {session?.user ? "글 추가" : "로그인하고 추가"}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {animes.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">
            이 장르에 등록된 애니가 없습니다.
            {" "}
            <Link
              href={
                session?.user
                  ? `/anime/new?genre=${genreParam}`
                  : `/auth/signin?callbackUrl=${encodeURIComponent(`/anime/new?genre=${genreParam}`)}`
              }
              className="text-primary hover:underline"
            >
              첫 글 만들기
            </Link>
          </p>
        ) : (
          animes.map((a) => (
            <Link key={a.id} href={`/anime/${a.slug}`}>
              <Card className="overflow-hidden hover:border-primary/40 h-full rounded-2xl">
                {a.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt={a.title} className="w-full aspect-[3/4] object-cover" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-muted/40 flex items-center justify-center text-4xl">
                    {info.emoji}
                  </div>
                )}
                <CardContent className="p-4">
                  <h2 className="font-semibold">{a.title}</h2>
                  {a.titleEn && <p className="text-xs text-muted-foreground mt-0.5">{a.titleEn}</p>}
                  <p className="text-xs text-muted-foreground mt-2">@{a.creator.username}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
