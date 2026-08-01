import { repairBrokenAnimeSlugs } from "@/lib/anime-wiki-seeds";
import { db } from "@/lib/db";
import {
  getCachedCultureWikiPopular,
  getCachedCultureWikiRecent,
} from "@/lib/culture-wiki-hub-data";
import { genreFromParam, getGenreInfo } from "@/lib/anime-genres";
import { AnimeHubClient } from "@/components/anime/anime-hub-client";
import type { AnimeHubCatalogItem } from "@/components/anime/anime-hub-catalog";
import { auth } from "@/lib/auth";

export const revalidate = 120;

export default async function AnimeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  try {
    await repairBrokenAnimeSlugs(db);
  } catch {
    /* DB 미연결 시 무시 */
  }

  const { genre: genreRaw } = await searchParams;
  const activeGenre = genreRaw ? genreFromParam(genreRaw) : null;
  const session = await auth().catch(() => null);

  let popular: Awaited<ReturnType<typeof getCachedCultureWikiPopular>> = [];
  let recent: Awaited<ReturnType<typeof getCachedCultureWikiRecent>> = [];
  let catalog: AnimeHubCatalogItem[] = [];

  try {
    const [popularRes, recentRes, rows] = await Promise.all([
      getCachedCultureWikiPopular(),
      getCachedCultureWikiRecent(),
      db.anime.findMany({
        where: activeGenre ? { genre: activeGenre } : undefined,
        take: 80,
        orderBy: activeGenre ? { title: "asc" } : { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          titleEn: true,
          coverUrl: true,
          genre: true,
          creator: { select: { username: true } },
        },
      }),
    ]);
    popular = popularRes;
    recent = recentRes;
    catalog = rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      titleEn: a.titleEn,
      coverUrl: a.coverUrl,
      genreEmoji: getGenreInfo(a.genre).emoji,
      creatorUsername: a.creator.username,
    }));
  } catch {
    popular = [];
    recent = [];
    catalog = [];
  }

  const newPath = `/anime/new${activeGenre && genreRaw ? `?genre=${genreRaw}` : ""}`;
  const newHref = session?.user
    ? newPath
    : `/auth/signin?callbackUrl=${encodeURIComponent(newPath || "/anime/new")}`;

  return (
    <AnimeHubClient
      activeGenre={activeGenre}
      catalog={catalog}
      popular={popular}
      recent={recent}
      newHref={newHref}
    />
  );
}
