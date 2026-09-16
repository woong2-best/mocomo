import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { userDisplayName } from "@/lib/user-public-select";

export type CultureWikiHubItem = {
  key: string;
  href: string;
  title: string;
  titleEn?: string | null;
  slug?: string;
  kind: "anime" | "cosplayer" | "cosplay";
  updatedAt?: Date;
  viewCount?: number;
};

async function fetchCultureWikiPopular(limit: number): Promise<CultureWikiHubItem[]> {
  const animeTake = Math.min(limit, 30);
  const sideTake = Math.min(Math.ceil(limit / 2), 20);

  // Culture Wiki lists are anime (+ cosplayer profiles) only — never cosplay board
  // marketplace posts ([대여]/[판매]/[급처], etc.).
  const [anime, cosplayers] = await Promise.all([
    db.anime.findMany({
      take: animeTake,
      orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
      select: { id: true, slug: true, title: true, titleEn: true, viewCount: true },
    }),
    db.cosplayerProfile.findMany({
      take: sideTake,
      orderBy: [{ followerCount: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        stageName: true,
        followerCount: true,
        user: { select: { username: true, name: true } },
      },
    }),
  ]);

  const merged: (CultureWikiHubItem & { score: number })[] = [
    ...mapAnimePopular(anime),
    ...cosplayers.map((cp) => ({
      key: `cosplayer-${cp.id}`,
      href: `/cosplay/${cp.user.username}`,
      title: cp.stageName?.trim() || userDisplayName(cp.user),
      kind: "cosplayer" as const,
      score: cp.followerCount * 10 + 1,
    })),
  ];

  return merged
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...item }) => item);
}

async function fetchCultureWikiRecent(limit: number): Promise<CultureWikiHubItem[]> {
  const animeTake = Math.min(limit, 30);
  const sideTake = Math.min(Math.ceil(limit / 2), 20);

  const [anime, cosplayers] = await Promise.all([
    db.anime.findMany({
      take: animeTake,
      orderBy: { updatedAt: "desc" },
      select: { slug: true, title: true, titleEn: true, updatedAt: true },
    }),
    db.cosplayerProfile.findMany({
      take: sideTake,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        stageName: true,
        updatedAt: true,
        user: { select: { username: true, name: true } },
      },
    }),
  ]);

  const merged: (CultureWikiHubItem & { score: number })[] = [
    ...mapAnimeRecent(anime),
    ...cosplayers.map((cp) => ({
      key: `cosplayer-${cp.id}`,
      href: `/cosplay/${cp.user.username}`,
      title: cp.stageName?.trim() || userDisplayName(cp.user),
      kind: "cosplayer" as const,
      score: cp.updatedAt.getTime(),
      updatedAt: cp.updatedAt,
    })),
  ];

  return merged
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...item }) => item);
}

function mapAnimePopular(
  rows: { id: string; slug: string; title: string; titleEn: string | null; viewCount: number }[]
): (CultureWikiHubItem & { score: number })[] {
  return rows.map((r) => ({
    key: `anime-${r.id}`,
    href: `/anime/${r.slug}`,
    title: r.title,
    titleEn: r.titleEn,
    slug: r.slug,
    kind: "anime" as const,
    score: r.viewCount,
    viewCount: r.viewCount,
  }));
}

function mapAnimeRecent(
  rows: { slug: string; title: string; titleEn: string | null; updatedAt: Date }[]
): (CultureWikiHubItem & { score: number })[] {
  return rows.map((r) => ({
    key: `anime-${r.slug}`,
    href: `/anime/${r.slug}`,
    title: r.title,
    titleEn: r.titleEn,
    slug: r.slug,
    kind: "anime" as const,
    score: r.updatedAt.getTime(),
    updatedAt: r.updatedAt,
  }));
}

export const getCachedCultureWikiPopular = unstable_cache(
  () => fetchCultureWikiPopular(10),
  ["culture-wiki-popular-v2"],
  { revalidate: 120 }
);

export const getCachedCultureWikiPopularAll = unstable_cache(
  () => fetchCultureWikiPopular(50),
  ["culture-wiki-popular-all-v2"],
  { revalidate: 120 }
);

export const getCachedCultureWikiRecent = unstable_cache(
  () => fetchCultureWikiRecent(10),
  ["culture-wiki-recent-v2"],
  { revalidate: 60 }
);

export const getCachedCultureWikiRecentAll = unstable_cache(
  () => fetchCultureWikiRecent(50),
  ["culture-wiki-recent-all-v2"],
  { revalidate: 60 }
);

export const getCachedCosplayerProfileCount = unstable_cache(
  async () => db.cosplayerProfile.count(),
  ["cosplayer-profile-count"],
  { revalidate: 120 }
);
