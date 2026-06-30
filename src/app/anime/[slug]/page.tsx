import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { AnimeFollowButton } from "@/components/anime/anime-follow-button";
import { AnimeViewTracker } from "@/components/anime/anime-view-tracker";
import { AnimeDetailTabs, type AnimeDetailTabsProps } from "@/components/anime/anime-detail-tabs";
import { getCachedSession, isSiteOperator } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { getGenreInfo, genreToParam } from "@/lib/anime-genres";
import { Pencil, Shield } from "lucide-react";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export const revalidate = 120;

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
  const activeTab = tab === "cosplayers" || tab === "goods" || tab === "community" ? tab : "info";

  const [session, anime, tabExtras] = await Promise.all([
    getCachedSession(),
    db.anime.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        genre: true,
        studio: true,
        bannerUrl: true,
        coverUrl: true,
        synopsis: true,
        worldInfo: true,
        infobox: true,
        tags: true,
        characters: true,
        isProtected: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { id: true, username: true, name: true, image: true } },
      },
    }),
    activeTab === "cosplayers"
      ? db.cosplayerAnime.findMany({
          where: { anime: { slug } },
          take: 24,
          include: {
            profile: {
              select: {
                user: { select: { username: true, name: true, image: true } },
                photos: { take: 1, select: { url: true } },
              },
            },
          },
        })
      : activeTab === "goods"
        ? db.animeGoods.findMany({ where: { anime: { slug } }, take: 24 })
        : activeTab === "community"
          ? db.post.findMany({
              where: { anime: { slug } },
              take: 30,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                content: true,
                author: { select: { username: true, image: true } },
              },
            })
          : Promise.resolve([]),
  ]);

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

  const cosplayers: AnimeDetailTabsProps["cosplayers"] =
    activeTab === "cosplayers" ? (tabExtras as AnimeDetailTabsProps["cosplayers"]) : [];
  const goods: AnimeDetailTabsProps["goods"] =
    activeTab === "goods" ? (tabExtras as AnimeDetailTabsProps["goods"]) : [];
  const posts: AnimeDetailTabsProps["posts"] =
    activeTab === "community" ? (tabExtras as AnimeDetailTabsProps["posts"]) : [];

  const following = session?.user?.id
    ? !!(await db.animeFollow.findUnique({
        where: { userId_animeId: { userId: session.user.id, animeId: anime.id } },
      }))
    : false;

  return (
    <AppPageChrome maxWidth="5xl" className="!px-0 !pt-0" spacing="sm">
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
          <NativePageTitle>
            <h1 className="text-2xl md:text-3xl font-bold">{anime.title}</h1>
          </NativePageTitle>
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

      <AnimeDetailTabs
        slug={slug}
        initialTab={tab}
        showEditLink={canEdit}
        isLoggedIn={isLoggedIn}
        characterNames={characterNames}
        cosplayers={cosplayers}
        goods={goods}
        posts={posts}
        anime={{
          id: anime.id,
          title: anime.title,
          titleEn: anime.titleEn,
          genre: anime.genre,
          studio: anime.studio,
          coverUrl: anime.coverUrl,
          synopsis: anime.synopsis,
          worldInfo: anime.worldInfo,
          infobox: anime.infobox,
          tags: anime.tags,
          updatedAt: anime.updatedAt.toISOString(),
        }}
      />
    </AppPageChrome>
  );
}
