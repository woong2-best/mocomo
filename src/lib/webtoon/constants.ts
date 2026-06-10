import type { WebtoonPublishDay } from "@prisma/client";

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
