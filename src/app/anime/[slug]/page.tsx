import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnimeTabs } from "@/components/anime/anime-tabs";
import { AnimeFollowButton } from "@/components/anime/anime-follow-button";
import { AnimeViewTracker } from "@/components/anime/anime-view-tracker";
import { AnimeGoodsPanel } from "@/components/anime/anime-goods-panel";
import { AnimeCommunityPanel } from "@/components/anime/anime-community-panel";
import { WikiContent } from "@/components/anime/wiki-content";
import { getCachedSession, isSiteOperator } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const revalidate = 120;
import { getGenreInfo, genreToParam } from "@/lib/anime-genres";
import { Pencil, Shield } from "lucide-react";

function formatKoreanDate(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function parseCharacterNames(characters: unknown): string[] {
  if (!characters || !Array.isArray(characters)) return [];
  return characters
    .map((c) => (typeof c === "object" && c && "name" in c ? String((c as { name: string }).name) : ""))
    .filter(Boolean);
}

export default async function AnimeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "info" } = await searchParams;
  const session = await getCachedSession();

  const anime = await db.anime.findUnique({
    where: { slug },
    include: {
      creator: { select: { id: true, username: true, name: true, image: true } },
      cosplayers: {
        take: 24,
        include: {
          profile: {
            select: {
              stageName: true,
              user: { select: { username: true, image: true } },
              photos: { take: 1, select: { url: true } },
            },
          },
        },
      },
      goods: { take: 24 },
      posts: {
        take: 30,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { username: true, image: true } } },
      },
    },
  });

  if (!anime) notFound();

  const genreInfo = getGenreInfo(anime.genre);
  const isLoggedIn = !!session?.user;
  const canEditProtected =
    !!session?.user &&
    (session.user.role === UserRole.ADMIN ||
      session.user.role === UserRole.MODERATOR ||
      (session.user.username
        ? isSiteOperator(session.user as { username: string; role: string; email?: string | null })
        : false));
  const canEdit = isLoggedIn && (!anime.isProtected || canEditProtected);
  const characterNames = parseCharacterNames(anime.characters);

  const following = session?.user?.id
    ? !!(await db.animeFollow.findUnique({
        where: { userId_animeId: { userId: session.user.id, animeId: anime.id } },
      }))
    : false;

  return (
    <div className="max-w-5xl mx-auto">
      <AnimeViewTracker slug={slug} />
      <div
        className="relative h-48 md:h-64 bg-gradient-to-br from-neon-purple/40 to-neon-cyan/20"
        style={
          anime.bannerUrl
            ? { backgroundImage: `url(${anime.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Link
            href={`/anime/list/${genreToParam(anime.genre)}`}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/20 hover:bg-primary/30 mb-2"
          >
            {genreInfo.emoji} {genreInfo.label}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">{anime.title}</h1>
          {anime.titleEn && <p className="text-muted-foreground text-sm">{anime.titleEn}</p>}
          {anime.isProtected && (
            <p className="inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
              <Shield className="h-3 w-3" />
              보호된 문서
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {session?.user ? (
              <AnimeFollowButton animeId={anime.id} initialFollowing={following} />
            ) : (
              <Link href="/auth/signin">
                <Button size="sm">팔로우</Button>
              </Link>
            )}
            {canEdit ? (
              <Link href={`/anime/${slug}/edit`}>
                <Button size="sm" variant="outline" className="gap-1">
                  <Pencil className="h-3.5 w-3.5" />
                  편집
                </Button>
              </Link>
            ) : isLoggedIn && anime.isProtected ? (
              <Button size="sm" variant="outline" className="gap-1" disabled title="운영진만 편집 가능">
                <Shield className="h-3.5 w-3.5" />
                편집 제한
              </Button>
            ) : (
              <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/anime/${slug}/edit`)}`}>
                <Button size="sm" variant="outline" className="gap-1">
                  <Pencil className="h-3.5 w-3.5" />
                  로그인하고 편집
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 pt-4 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>
            작성자{" "}
            <Link href={`/u/${anime.creator.username}`} className="text-foreground font-medium hover:underline">
              @{anime.creator.username}
            </Link>
          </span>
          <span>최초 등록 {formatKoreanDate(anime.createdAt)}</span>
          <span>마지막 수정 {formatKoreanDate(anime.updatedAt)}</span>
        </div>
      </div>

      <AnimeTabs activeTab={tab} slug={slug} showEditLink={canEdit} />

      <div className="p-4 lg:p-6">
        {tab === "info" && (
          <div className="space-y-6 prose prose-invert max-w-none">
            {anime.studio && (
              <section>
                <h2 className="text-lg font-semibold text-neon-cyan">제작사</h2>
                <p className="text-sm">{anime.studio}</p>
              </section>
            )}
            {anime.synopsis && (
              <section>
                <h2 className="text-lg font-semibold">줄거리</h2>
                <WikiContent source={anime.synopsis} className="text-sm text-muted-foreground" />
              </section>
            )}
            {anime.worldInfo && (
              <section>
                <h2 className="text-lg font-semibold">세계관</h2>
                <WikiContent source={anime.worldInfo} className="text-sm text-muted-foreground" />
              </section>
            )}
            {characterNames.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold">등장인물</h2>
                <ul className="flex flex-wrap gap-2 mt-2">
                  {characterNames.map((name) => (
                    <li key={name} className="text-sm px-3 py-1 rounded-full bg-muted/50">
                      {name}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {anime.cosplayers.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">코스어</h2>
                  <Link href={`/anime/${slug}?tab=cosplayers`} className="text-sm text-primary hover:underline">
                    전체 보기 ({anime.cosplayers.length})
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {anime.cosplayers.slice(0, 6).map((link) => (
                    <Link
                      key={link.id}
                      href={`/cosplay/${link.profile.user.username}`}
                      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border/60 hover:bg-muted/40 text-sm"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={link.profile.user.image ?? undefined} />
                        <AvatarFallback>{link.character?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{link.profile.stageName || link.profile.user.username}</span>
                      {link.character && (
                        <span className="text-muted-foreground text-xs">· {link.character}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <div className="flex flex-wrap gap-2">
              {anime.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded-full bg-primary/20">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {tab === "cosplayers" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {anime.cosplayers.length === 0 ? (
              <p className="text-muted-foreground col-span-full">연결된 코스어가 없습니다.</p>
            ) : (
              anime.cosplayers.map((link) => (
                <Link key={link.id} href={`/cosplay/${link.profile.user.username}`}>
                  <Card className="overflow-hidden hover:border-primary/40">
                    {link.profile.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={link.profile.photos[0].url} alt="" className="w-full aspect-square object-cover" />
                    )}
                    <CardContent className="p-3 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={link.profile.user.image} />
                        <AvatarFallback>{link.character?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{link.profile.stageName || link.profile.user.username}</p>
                        {link.character && <p className="text-xs text-muted-foreground">{link.character}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "goods" && (
          <AnimeGoodsPanel animeId={anime.id} slug={slug} goods={anime.goods} canEdit={isLoggedIn} />
        )}

        {tab === "community" && (
          <AnimeCommunityPanel
            animeId={anime.id}
            slug={slug}
            posts={anime.posts}
            isLoggedIn={isLoggedIn}
          />
        )}
      </div>
    </div>
  );
}
