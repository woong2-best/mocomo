import {
  GLOBAL_DISCOVERY_REGIONS,
  SUBCULTURE_RELEVANCE,
  type GlobalDiscoveryRegion,
} from "@/lib/subculture-event-global-config";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";

type WikiSearchHit = {
  title: string;
  snippet?: string;
  pageid?: number;
};

function slugKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function inferCategory(title: string): FetchedSubcultureEvent["category"] {
  const t = title.toLowerCase();
  if (/maid|メイド/.test(t)) return "maid_cafe";
  if (/cosplay|コスプレ|cos/.test(t)) return "cosplay";
  if (/comic|manga|doujin|同人|コミ|漫展|comicup|comiket|ff\d|cp\d/.test(t)) return "comic";
  if (/goods|merch|굿즈|グッズ/.test(t)) return "goods";
  if (/anime|アニメ|动漫|動漫|animation/.test(t)) return "anime";
  return "other";
}

function defaultEventWindow(): { startsAt: string; endsAt: string } {
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() + 4);
  start.setUTCDate(15);
  start.setUTCHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 2);
  end.setUTCHours(18, 0, 0, 0);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

async function searchWikipedia(
  lang: string,
  query: string
): Promise<WikiSearchHit[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "4",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: { search?: WikiSearchHit[] };
  };
  return data.query?.search ?? [];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function hitsToEvents(
  hits: WikiSearchHit[],
  region: GlobalDiscoveryRegion,
  seen: Set<string>
): Promise<FetchedSubcultureEvent[]> {
  const out: FetchedSubcultureEvent[] = [];
  const { startsAt, endsAt } = defaultEventWindow();

  for (const hit of hits) {
    if (!SUBCULTURE_RELEVANCE.test(`${hit.title} ${hit.snippet ?? ""}`)) continue;

    const slug = slugKey(hit.title);
    if (!slug) continue;
    const externalKey = `auto-wiki-${region.country}-${slug}`.slice(0, 120);
    if (seen.has(externalKey)) continue;
    seen.add(externalKey);

    const wikiTitle = hit.title.replace(/ /g, "_");
    out.push({
      externalKey,
      country: region.country,
      title: hit.title,
      description: stripHtml(hit.snippet ?? "") || `${region.iso.toUpperCase()} · Wikipedia`,
      category: inferCategory(hit.title),
      venueName: hit.title,
      address: region.iso.toUpperCase(),
      lat: region.center.lat,
      lng: region.center.lng,
      startsAt,
      endsAt,
      sourceUrl: `https://${region.wikipediaLang}.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
      sourceId: "global-wiki",
    });
  }
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wikipedia 현지어 검색으로 전 세계 서브컬처 행사 후보 수집 */
export async function fetchGlobalWikipediaEvents(): Promise<FetchedSubcultureEvent[]> {
  const seen = new Set<string>();
  const events: FetchedSubcultureEvent[] = [];

  const tasks = GLOBAL_DISCOVERY_REGIONS.flatMap((region) =>
    region.queries.slice(0, 2).map((query) => ({ region, query }))
  );

  const BATCH = 12;
  for (let i = 0; i < tasks.length; i += BATCH) {
    const batch = tasks.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async ({ region, query }) => {
        try {
          const hits = await searchWikipedia(region.wikipediaLang, query);
          return { region, hits };
        } catch {
          return { region, hits: [] as WikiSearchHit[] };
        }
      })
    );
    for (const { region, hits } of results) {
      events.push(...(await hitsToEvents(hits, region, seen)));
    }
    if (i + BATCH < tasks.length) await sleep(200);
  }

  return events.slice(0, 200);
}
