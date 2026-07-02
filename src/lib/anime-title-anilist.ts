import { unstable_cache } from "next/cache";

type AniListTitle = {
  native: string | null;
  english: string | null;
  romaji: string | null;
};

async function fetchAniListTitle(search: string): Promise<AniListTitle | null> {
  const q = search.trim();
  if (!q) return null;

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: `query ($search: String) {
          Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            title { native english romaji }
          }
        }`,
        variables: { search: q },
      }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { Media?: { title?: AniListTitle } | null };
    };
    return json.data?.Media?.title ?? null;
  } catch {
    return null;
  }
}

const cachedAniListTitle = unstable_cache(
  async (search: string) => fetchAniListTitle(search),
  ["anilist-anime-title"],
  { revalidate: 86400 }
);

export async function lookupJapaneseAnimeTitle(
  title: string,
  titleEn?: string | null
): Promise<string | null> {
  for (const search of [titleEn?.trim(), title].filter(Boolean) as string[]) {
    const hit = await cachedAniListTitle(search);
    const native = hit?.native?.trim();
    if (native) return native;
  }
  return null;
}
