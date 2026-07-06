import { repairBrokenAnimeSlugs } from "@/lib/anime-wiki-seeds";
import { db } from "@/lib/db";
import { getCachedAnimeGenreCounts } from "@/lib/cached-data";
import {
  getCachedCosplayerProfileCount,
  getCachedCultureWikiPopular,
  getCachedCultureWikiRecent,
} from "@/lib/culture-wiki-hub-data";
import { AnimeHubClient } from "@/components/anime/anime-hub-client";

export const revalidate = 120;

export default async function AnimeHubPage() {
  try {
    await repairBrokenAnimeSlugs(db);
  } catch {
    /* DB 미연결 시 무시 */
  }

  let counts: Awaited<ReturnType<typeof getCachedAnimeGenreCounts>> = [];
  let popular: Awaited<ReturnType<typeof getCachedCultureWikiPopular>> = [];
  let recent: Awaited<ReturnType<typeof getCachedCultureWikiRecent>> = [];
  let cosplayerCount = 0;

  try {
    [counts, popular, recent, cosplayerCount] = await Promise.all([
      getCachedAnimeGenreCounts(),
      getCachedCultureWikiPopular(),
      getCachedCultureWikiRecent(),
      getCachedCosplayerProfileCount(),
    ]);
  } catch {
    counts = [];
    popular = [];
    recent = [];
    cosplayerCount = 0;
  }

  const countMap = Object.fromEntries(counts.map((c) => [c.genre, c._count.id]));

  return (
    <AnimeHubClient
      countMap={countMap}
      popular={popular}
      recent={recent}
      cosplayerCount={cosplayerCount}
    />
  );
}
