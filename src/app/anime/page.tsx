import { repairBrokenAnimeSlugs } from "@/lib/anime-wiki-seeds";
import { db } from "@/lib/db";
import {
  getCachedAnimeGenreCounts,
  getCachedPopularAnime,
  getCachedRecentAnime,
} from "@/lib/cached-data";
import { AnimeHubClient } from "@/components/anime/anime-hub-client";

export const revalidate = 120;

export default async function AnimeHubPage() {
  try {
    await repairBrokenAnimeSlugs(db);
  } catch {
    /* DB 미연결 시 무시 */
  }

  let counts: Awaited<ReturnType<typeof getCachedAnimeGenreCounts>> = [];
  let popular: Awaited<ReturnType<typeof getCachedPopularAnime>> = [];
  let recent: Awaited<ReturnType<typeof getCachedRecentAnime>> = [];

  try {
    [counts, popular, recent] = await Promise.all([
      getCachedAnimeGenreCounts(),
      getCachedPopularAnime(),
      getCachedRecentAnime(),
    ]);
  } catch {
    counts = [];
    popular = [];
    recent = [];
  }

  const countMap = Object.fromEntries(counts.map((c) => [c.genre, c._count.id]));

  return <AnimeHubClient countMap={countMap} popular={popular} recent={recent} />;
}
