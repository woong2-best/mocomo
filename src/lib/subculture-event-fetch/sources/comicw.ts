import { fetchText } from "@/lib/subculture-event-fetch/http";
import { parseIsoRange, stripHtml } from "@/lib/subculture-event-fetch/parse";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";
import { venueByKeyword, VENUES } from "@/lib/subculture-event-fetch/venues";

function parseComicwTitle(rawTitle: string, id: number): string {
  const raw = stripHtml(rawTitle).replace(/^\[.*?\]\s*/, "").trim();
  const afterSlash = raw.split("/").pop()?.trim();
  if (afterSlash && /코믹월드/i.test(afterSlash)) return afterSlash;
  const match = raw.match(/코믹월드[\s\S]*$/i);
  if (match) return match[0].trim();
  return `코믹월드 ${id}`;
}

function discoverEventIds(html: string): number[] {
  const ids = new Set<number>();
  for (const m of html.matchAll(/\/e\/(\d+)\//g)) {
    const n = Number(m[1]);
    if (n >= 300 && n <= 400) ids.add(n);
  }
  for (const id of [333, 334, 335, 336]) ids.add(id);
  return [...ids].sort((a, b) => a - b);
}

export async function fetchComicWorldEvents(): Promise<FetchedSubcultureEvent[]> {
  const home = await fetchText("https://comicw.net/");
  const ids = discoverEventIds(home);
  const events: FetchedSubcultureEvent[] = [];
  const now = Date.now();

  for (const id of ids) {
    try {
      const html = await fetchText(`https://comicw.net/e/${id}/`);
      const range = parseIsoRange(html);
      if (!range) continue;
      if (new Date(range.endsAt).getTime() < now - 86400000) continue;

      const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const title = titleMatch ? parseComicwTitle(titleMatch[1], id) : `코믹월드 ${id}`;

      const venueHint = stripHtml(html);
      let venue = venueByKeyword(venueHint) ?? venueByKeyword(title);
      if (!venue) {
        if (/부산|bexco/i.test(venueHint + title)) venue = VENUES.bexco;
        else venue = VENUES.kintex;
      }

      events.push({
        sourceId: "comicw",
        country: "kr",
        externalKey: `auto-comicw-${id}`,
        title,
        description: "comicw.net 공식 행사 페이지에서 자동 수집",
        category: "comic",
        venueName: venue.venueName,
        address: venue.address,
        lat: venue.lat,
        lng: venue.lng,
        startsAt: range.startsAt,
        endsAt: range.endsAt,
        sourceUrl: `https://comicw.net/e/${id}/`,
        officialNoticeUrl: `https://comicw.net/e/${id}/8`,
      });
    } catch {
      /* skip single event */
    }
  }

  return events;
}
