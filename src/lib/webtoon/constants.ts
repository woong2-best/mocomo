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
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
  SUN: "일",
};

export const WEBTOON_DAY_FULL: Record<WebtoonPublishDay, string> = {
  MON: "월요웹툰",
  TUE: "화요웹툰",
  WED: "수요웹툰",
  THU: "목요웹툰",
  FRI: "금요웹툰",
  SAT: "토요웹툰",
  SUN: "일요웹툰",
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
  SCHOOL: "학원",
  ACTION: "액션",
  SF: "SF",
  STORY: "스토리",
  FANTASY: "판타지",
  BL_GL: "BL/백합",
  COMEDY: "개그/코미디",
  PURE_LOVE: "연애/순정",
  DRAMA: "드라마",
  ROMANCE: "로맨스",
  HISTORICAL: "시대극",
  SPORTS: "스포츠",
  SLICE_OF_LIFE: "일상",
  MYSTERY: "추리/미스터리",
  HORROR: "공포/스릴러",
  ADULT: "성인",
  OMNIBUS: "옴니버스",
  EPISODE: "에피소드",
  MARTIAL_ARTS: "무협",
  SHONEN: "소년",
  OTHER: "기타",
};

const WEBTOON_GENRE_SET = new Set<string>(WEBTOON_GENRES);

export function parseWebtoonGenre(raw: string | undefined | null): WebtoonGenre | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toUpperCase();
  return WEBTOON_GENRE_SET.has(key) ? (key as WebtoonGenre) : null;
}
