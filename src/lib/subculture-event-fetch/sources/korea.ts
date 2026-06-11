import { fetchText } from "@/lib/subculture-event-fetch/http";
import {
  isoKst,
  parseDotDateRange,
  parseIsoDateTimes,
  parseKrYmdRange,
} from "@/lib/subculture-event-fetch/parse";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";
import { VENUES } from "@/lib/subculture-event-fetch/venues";

export async function fetchGstarEvents(): Promise<FetchedSubcultureEvent[]> {
  const html = await fetchText("https://www.gstar.or.kr/");
  const venue = VENUES.bexco;
  const now = Date.now();

  const start = parseIsoDateTimes(html).find((t) => /2026-11-\d{2}T/.test(t));
  if (!start) return [];

  const [, y, m, d] = start.match(/^(20\d{2})-(\d{2})-(\d{2})/) ?? [];
  if (!y || !m || !d) return [];

  const endDay = Number(d) + 3;
  const endsAt = isoKst(Number(y), Number(m), endDay, 18);
  if (new Date(endsAt).getTime() < now - 86400000) return [];

  return [
    {
      sourceId: "gstar",
      country: "kr",
      externalKey: "auto-gstar-2026",
      title: "지스타 2026 (G-STAR)",
      description: "gstar.or.kr 공식 사이트에서 자동 수집",
      category: "anime",
      venueName: venue.venueName,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      startsAt: start,
      endsAt,
      sourceUrl: "https://www.gstar.or.kr/",
      officialNoticeUrl: "https://www.gstar.or.kr/eng/part/gstar_part_info.do",
    },
  ];
}

export async function fetchSeoulPopconEvents(): Promise<FetchedSubcultureEvent[]> {
  const html = await fetchText("https://seoulpopcon.org/");
  const venue = VENUES.coex;
  const now = Date.now();

  const range =
    parseKrYmdRange(html) ??
    parseDotDateRange(html) ??
    (html.includes("2026-08-14T")
      ? {
          startsAt: "2026-08-14T10:00:00+09:00",
          endsAt: "2026-08-16T18:00:00+09:00",
        }
      : null);

  if (!range || new Date(range.endsAt).getTime() < now - 86400000) return [];

  return [
    {
      sourceId: "seoulpopcon",
      country: "kr",
      externalKey: "auto-seoulpopcon-2026",
      title: "2026 서울팝콘 by CCXP",
      description: "seoulpopcon.org 공식 사이트에서 자동 수집",
      category: "cosplay",
      venueName: "코엑스 C홀",
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      startsAt: range.startsAt,
      endsAt: range.endsAt,
      sourceUrl: "https://seoulpopcon.org/",
      officialNoticeUrl: "https://seoulpopcon.org/seoulpopcon",
    },
  ];
}
