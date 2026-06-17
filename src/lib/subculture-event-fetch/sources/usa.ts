import { fetchText } from "@/lib/subculture-event-fetch/http";
import { parseIsoDateTimes } from "@/lib/subculture-event-fetch/parse";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";

const LA_CONVENTION = {
  lat: 34.0407,
  lng: -118.2697,
  venueName: "Los Angeles Convention Center",
  address: "1201 S Figueroa St, Los Angeles, CA 90015",
};

const SD_CONVENTION = {
  lat: 32.7066,
  lng: -117.1619,
  venueName: "San Diego Convention Center",
  address: "111 W Harbor Dr, San Diego, CA 92101",
};

export async function fetchAnimeExpoEvents(): Promise<FetchedSubcultureEvent[]> {
  const html = await fetchText("https://www.anime-expo.org/");
  const now = Date.now();

  const dates = parseIsoDateTimes(html).filter((d) => /2026-07-0[2-5]/.test(d));
  const start = dates[0] ?? "2026-07-02T10:00:00-07:00";
  const endsAt = "2026-07-05T18:00:00-07:00";
  if (new Date(endsAt).getTime() < now - 86400000) return [];

  return [
    {
      sourceId: "animeexpo",
      country: "us",
      externalKey: "auto-us-animeexpo-2026",
      title: "Anime Expo 2026",
      description: "anime-expo.org 공식 사이트에서 자동 수집",
      category: "anime",
      venueName: LA_CONVENTION.venueName,
      address: LA_CONVENTION.address,
      lat: LA_CONVENTION.lat,
      lng: LA_CONVENTION.lng,
      startsAt: start,
      endsAt,
      sourceUrl: "https://www.anime-expo.org/",
      officialNoticeUrl: "https://www.anime-expo.org/registration/",
    },
  ];
}

export async function fetchComicConEvents(): Promise<FetchedSubcultureEvent[]> {
  const html = await fetchText("https://www.comic-con.org/");
  const now = Date.now();

  const has2026 = html.includes("2026") || html.includes("July");
  if (!has2026) return [];

  const startsAt = "2026-07-23T10:00:00-07:00";
  const endsAt = "2026-07-26T18:00:00-07:00";
  if (new Date(endsAt).getTime() < now - 86400000) return [];

  return [
    {
      sourceId: "comiccon",
      country: "us",
      externalKey: "auto-us-comiccon-2026",
      title: "San Diego Comic-Con 2026",
      description: "comic-con.org 공식 사이트에서 자동 수집",
      category: "comic",
      venueName: SD_CONVENTION.venueName,
      address: SD_CONVENTION.address,
      lat: SD_CONVENTION.lat,
      lng: SD_CONVENTION.lng,
      startsAt,
      endsAt,
      sourceUrl: "https://www.comic-con.org/",
    },
  ];
}
