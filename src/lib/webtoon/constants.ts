import type { WebtoonGenre, WebtoonPublishDay } from "@prisma/client";

/** 월→일 (네이버 웹툰 스타일) */
export const WEBTOON_WEEK_DAYS: WebtoonPublishDay[] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

export const WEBTOON_DAY_LABEL: Record<WebtoonPublishDay, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export const WEBTOON_DAY_FULL: Record<WebtoonPublishDay, string> = {
  MON: "Monday webtoons",
  TUE: "Tuesday webtoons",
  WED: "Wednesday webtoons",
  THU: "Thursday webtoons",
  FRI: "Friday webtoons",
  SAT: "Saturday webtoons",
  SUN: "Sunday webtoons",
};

const JS_DAY_TO_WEBTOON: WebtoonPublishDay[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function getTodayWebtoonDay(): WebtoonPublishDay {
  return JS_DAY_TO_WEBTOON[new Date().getDay()] ?? "MON";
}

export const WEBTOON_ACCESS_COOKIE = "mocomo_webtoon_access";
export const WEBTOON_ACCESS_HOURS = 24;

/** 장르 탭 순서 (전체 제외) */
export const WEBTOON_GENRES: WebtoonGenre[] = [
  "SCHOOL",
  "ACTION",
  "SF",
  "STORY",
  "FANTASY",
  "BL_GL",
  "COMEDY",
  "PURE_LOVE",
  "DRAMA",
  "ROMANCE",
  "HISTORICAL",
  "SPORTS",
  "SLICE_OF_LIFE",
  "MYSTERY",
  "HORROR",
  "ADULT",
  "OMNIBUS",
  "EPISODE",
  "MARTIAL_ARTS",
  "SHONEN",
  "OTHER",
];

export const WEBTOON_GENRE_LABEL: Record<WebtoonGenre, string> = {
  SCHOOL: "School",
  ACTION: "Action",
  SF: "SF",
  STORY: "Story",
  FANTASY: "Fantasy",
  BL_GL: "BL/Yuri",
  COMEDY: "Comedy",
  PURE_LOVE: "Romance/Drama",
  DRAMA: "Drama",
  ROMANCE: "Romance",
  HISTORICAL: "Historical",
  SPORTS: "Sports",
  SLICE_OF_LIFE: "Slice of life",
  MYSTERY: "Mystery",
  HORROR: "Horror/Thriller",
  ADULT: "Mature",
  OMNIBUS: "Anthology",
  EPISODE: "Episodic",
  MARTIAL_ARTS: "Martial arts",
  SHONEN: "Shonen",
  OTHER: "Other",
};

const WEBTOON_GENRE_SET = new Set<string>(WEBTOON_GENRES);

export function parseWebtoonGenre(raw: string | undefined | null): WebtoonGenre | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toUpperCase();
  return WEBTOON_GENRE_SET.has(key) ? (key as WebtoonGenre) : null;
}

export type IllustrationMarketSort = "latest" | "popular";

export function parseIllustrationSort(raw: string | undefined | null): IllustrationMarketSort {
  return raw === "popular" ? "popular" : "latest";
}
