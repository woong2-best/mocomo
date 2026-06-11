import { fetchText } from "@/lib/subculture-event-fetch/http";
import { normalizeDigits, parseJaDayRange, parseJaSingleDay } from "@/lib/subculture-event-fetch/parse";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";
import { VENUES } from "@/lib/subculture-event-fetch/venues";

export async function fetchWonfesEvents(): Promise<FetchedSubcultureEvent[]> {
  const html = normalizeDigits(await fetchText("https://wonfes.jp/specialsite/"));
  const venue = VENUES.makuhari;
  const now = Date.now();

  const dateMatch =
    html.match(/2026年7月26日(?:\(日\))?/) ??
    html.match(/ワンダーフェスティバル2026[\s\S]{0,2000}?(20\d{2})年(\d{1,2})月(\d{1,2})日/);
  if (!dateMatch) return [];

  const range = parseJaSingleDay(dateMatch[0]);
  if (!range || new Date(range.endsAt).getTime() < now - 86400000) return [];

  return [
    {
      sourceId: "wonfes",
      country: "jp",
      externalKey: "auto-wonfes-2026-summer",
      title: "ワンダーフェスティバル2026[夏]",
      description: "wonfes.jp 공식 사이트에서 자동 수집",
      category: "goods",
      venueName: venue.venueName,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      startsAt: range.startsAt,
      endsAt: range.endsAt,
      sourceUrl: "https://wonfes.jp/specialsite/",
    },
  ];
}

export async function fetchKyomafEvents(): Promise<FetchedSubcultureEvent[]> {
  const html = normalizeDigits(await fetchText("https://kyomaf.kyoto/"));
  const venue = VENUES.kyoto_miyako;
  const now = Date.now();

  const block = html.match(/20\d{2}年\d{1,2}月\d{1,2}日[^0-9]{0,20}[〜～~][^0-9]{0,8}\d{1,2}月\d{1,2}日/);
  if (!block) return [];

  const range = parseJaDayRange(block[0]);
  if (!range || new Date(range.endsAt).getTime() < now - 86400000) return [];

  return [
    {
      sourceId: "kyomaf",
      country: "jp",
      externalKey: "auto-kyomaf",
      title: "京都国際マンガ・アニメフェア2026 (京まふ)",
      description: "kyomaf.kyoto 공식 사이트에서 자동 수집",
      category: "anime",
      venueName: venue.venueName,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      startsAt: range.startsAt,
      endsAt: range.endsAt,
      sourceUrl: "https://kyomaf.kyoto/",
    },
  ];
}

export async function fetchTgsEvents(): Promise<FetchedSubcultureEvent[]> {
  const urls = ["https://tgs.cesa.or.jp/", "https://expo.nikkeibp.co.jp/tgs/"];
  const venue = VENUES.makuhari;
  const now = Date.now();

  for (const url of urls) {
    try {
      const html = await fetchText(url);
      const datetimes = [...html.matchAll(/datetime="(20\d{2}-\d{2}-\d{2})"/g)]
        .map((m) => m[1])
        .filter((d) => d.startsWith("2026-09"));
      const unique = [...new Set(datetimes)].sort();
      if (unique.length < 2) continue;

      const year = Number(unique[0]?.slice(0, 4) ?? "2026");
      const startsAt = `${unique[0]}T09:30:00+09:00`;
      const endsAt = `${unique[unique.length - 1]}T17:00:00+09:00`;
      if (new Date(endsAt).getTime() < now - 86400000) continue;

      return [
        {
          sourceId: "tgs",
          country: "jp",
          externalKey: "auto-tgs",
          title: `東京ゲームショウ${year} (TGS)`,
          description: "TGS 공식 사이트에서 자동 수집",
          category: "anime",
          venueName: venue.venueName,
          address: venue.address,
          lat: venue.lat,
          lng: venue.lng,
          startsAt,
          endsAt,
          sourceUrl: url,
        },
      ];
    } catch {
      /* try next url */
    }
  }
  return [];
}
