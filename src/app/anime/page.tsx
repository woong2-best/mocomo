import { repairBrokenAnimeSlugs } from "@/lib/anime-wiki-seeds";
import { db } from "@/lib/db";
import {
  getCachedCultureWikiPopular,
  getCachedCultureWikiRecent,
} from "@/lib/culture-wiki-hub-data";
import {
  CULTURE_WIKI_CATALOG_PAGE_SIZE,
  cultureWikiCatalogTotalPages,
} from "@/lib/culture-wiki-catalog";
import { genreFromParam, getGenreInfo } from "@/lib/anime-genres";
import { AnimeHubClient } from "@/components/anime/anime-hub-client";
import type { AnimeHubCatalogItem } from "@/components/anime/anime-hub-catalog";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const revalidate = 120;

export default async function AnimeHubPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string; page?: string }>;
}) {
  try {
    await repairBrokenAnimeSlugs(db);
  } catch {
    /* DB 미연결 시 무시 */
  }

  const { genre: genreRaw, q: qRaw, page: pageRaw } = await searchParams;
  const activeGenre = genreRaw ? genreFromParam(genreRaw) : null;
  const q = qRaw?.trim() ?? "";
  const session = await auth().catch(() => null);

  const catalogWhere: Prisma.AnimeWhereInput = {
    ...(activeGenre ? { genre: activeGenre } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { titleEn: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  let popular: Awaited<ReturnType<typeof getCachedCultureWikiPopular>> = [];
  let recent: Awaited<ReturnType<typeof getCachedCultureWikiRecent>> = [];
  let catalog: AnimeHubCatalogItem[] = [];
  let totalCount = 0;
  let currentPage = 1;
  let totalPages = 1;

  try {
    const [popularRes, recentRes, total] = await Promise.all([
      getCachedCultureWikiPopular(),
      getCachedCultureWikiRecent(),
      db.anime.count({ where: catalogWhere }),
    ]);
    totalCount = total;
    totalPages = cultureWikiCatalogTotalPages(totalCount);
    currentPage = Math.min(Math.max(1, Number(pageRaw) || 1), totalPages);
    const offset = (currentPage - 1) * CULTURE_WIKI_CATALOG_PAGE_SIZE;

    const catalogRows = await db.anime.findMany({
      where: catalogWhere,
      take: CULTURE_WIKI_CATALOG_PAGE_SIZE,
      skip: offset,
      orderBy: activeGenre ? { title: "asc" } : { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        coverUrl: true,
        genre: true,
      },
    });

    popular = popularRes;
    recent = recentRes;
    catalog = catalogRows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      titleEn: a.titleEn,
      coverUrl: a.coverUrl,
      genreEmoji: getGenreInfo(a.genre).emoji,
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
      currentPage={currentPage}
      totalPages={totalPages}
      genreParam={genreRaw ?? null}
      searchQuery={q}
    />
  );
}
