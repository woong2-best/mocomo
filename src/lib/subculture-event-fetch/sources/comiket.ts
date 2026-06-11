import { fetchText } from "@/lib/subculture-event-fetch/http";
import { normalizeDigits, parseJaDayRange } from "@/lib/subculture-event-fetch/parse";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";
import { VENUES } from "@/lib/subculture-event-fetch/venues";

export async function fetchComiketEvents(): Promise<FetchedSubcultureEvent[]> {
  const html = normalizeDigits(await fetchText("https://www.comiket.co.jp/"));
  const events: FetchedSubcultureEvent[] = [];
  const venue = VENUES.tokyo_big_sight;
  const now = Date.now();

  const c108 = html.match(/2026年8月15日[～~〜]16日/);
  if (c108) {
    const range = parseJaDayRange(c108[0]);
    if (range && new Date(range.endsAt).getTime() >= now - 86400000) {
      events.push({
        sourceId: "comiket",
        country: "jp",
        externalKey: "auto-comiket-108",
        title: "Comic Market 108 (夏コミケ C108)",
        description: "comiket.co.jp 공식 안내에서 자동 수집",
        category: "comic",
        venueName: venue.venueName,
        address: venue.address,
        lat: venue.lat,
        lng: venue.lng,
        startsAt: range.startsAt,
        endsAt: range.endsAt,
        sourceUrl: "https://www.comiket.co.jp/",
        officialNoticeUrl: "https://www.comiket.co.jp/info-a/TAFO/C108TAFO/index.html",
      });
    }
  }

  const c109 = html.match(/2026年12月29日[～~〜]31日/);
  if (c109) {
    const range = parseJaDayRange(c109[0]);
    if (range && new Date(range.endsAt).getTime() >= now - 86400000) {
      events.push({
        sourceId: "comiket",
        country: "jp",
        externalKey: "auto-comiket-109",
        title: "Comic Market 109 (冬コミケ C109)",
        description: "comiket.co.jp 공식 안내에서 자동 수집",
        category: "comic",
        venueName: venue.venueName,
        address: venue.address,
        lat: venue.lat,
        lng: venue.lng,
        startsAt: range.startsAt,
        endsAt: range.endsAt,
        sourceUrl: "https://www.comiket.co.jp/",
      });
    }
  }

  return events;
}
