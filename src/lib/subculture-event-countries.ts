import { COUNTRIES, countryDisplayName, countryFlag, type Locale } from "@/lib/i18n/config";
import {
  GLOBAL_DISCOVERY_REGIONS,
  SUBCULTURE_COUNTRY_CODES,
  type SubcultureEventCountryCode,
} from "@/lib/subculture-event-global-config";

export type SubcultureEventCountry = SubcultureEventCountryCode | "other";

export type { SubcultureEventCountryCode };

export const SUBCULTURE_EVENT_COUNTRIES: SubcultureEventCountry[] = [
  ...SUBCULTURE_COUNTRY_CODES,
  "other",
];

const USER_TO_EVENT: Record<string, SubcultureEventCountry> = {
  OTHER: "other",
};
for (const code of SUBCULTURE_COUNTRY_CODES) {
  USER_TO_EVENT[code.toUpperCase()] = code;
}

export const SUBCULTURE_EVENT_COUNTRY_LABELS: Record<SubcultureEventCountry, string> = {
  kr: "한국",
  us: "미국",
  jp: "일본",
  cn: "중국",
  tw: "대만",
  th: "태국",
  vn: "베트남",
  ph: "필리핀",
  id: "인도네시아",
  sg: "싱가포르",
  my: "말레이시아",
  la: "라오스",
  kh: "캄보디아",
  mm: "미얀마",
  bn: "브루나이",
  hk: "홍콩",
  mo: "마카오",
  gb: "영국",
  fr: "프랑스",
  de: "독일",
  es: "스페인",
  it: "이탈리아",
  ru: "러시아",
  ca: "캐나다",
  br: "브라질",
  mx: "멕시코",
  ar: "아르헨티나",
  cl: "칠레",
  co: "콜롬비아",
  pe: "페루",
  au: "호주",
  nz: "뉴질랜드",
  fi: "핀란드",
  se: "스웨덴",
  no: "노르웨이",
  dk: "덴마크",
  pl: "폴란드",
  ro: "루마니아",
  hu: "헝가리",
  cz: "체코",
  at: "오스트리아",
  ch: "스위스",
  nl: "네덜란드",
  be: "벨기에",
  pt: "포르투갈",
  gr: "그리스",
  ua: "우크라이나",
  tr: "터키",
  sa: "사우디아라비아",
  ae: "아랍에미리트",
  il: "이스라엘",
  za: "남아프리카공화국",
  other: "글로벌",
};

const EVENT_COUNTRY_ISO: Record<SubcultureEventCountry, string> = Object.fromEntries(
  SUBCULTURE_EVENT_COUNTRIES.map((c) => [c, c === "other" ? "OTHER" : c.toUpperCase()])
) as Record<SubcultureEventCountry, string>;

export function eventCountryDisplayLabel(country: SubcultureEventCountry, locale: Locale): string {
  if (country === "other") {
    if (locale === "ko") return "글로벌";
    if (locale === "ja") return "グローバル";
    if (locale === "zh") return "全球";
    return "Global";
  }
  const nameLocale = locale === "ko" ? "ko" : "en";
  return countryDisplayName(EVENT_COUNTRY_ISO[country], nameLocale);
}

/** 지도 기본 뷰 */
export const SUBCULTURE_MAP_DEFAULTS: Record<
  SubcultureEventCountry,
  { lat: number; lng: number; zoom: number }
> = {
  ...Object.fromEntries(
    GLOBAL_DISCOVERY_REGIONS.map((r) => [
      r.country,
      { lat: r.center.lat, lng: r.center.lng, zoom: r.zoom },
    ])
  ),
  other: { lat: 20.0, lng: 0.0, zoom: 2 },
} as Record<SubcultureEventCountry, { lat: number; lng: number; zoom: number }>;

export function userCountryToEventCountry(userCountryCode: string): SubcultureEventCountry {
  const code = userCountryCode.toUpperCase();
  return USER_TO_EVENT[code] ?? "other";
}

export function eventCountryFlag(country: SubcultureEventCountry): string {
  if (country === "other") return "🌐";
  return countryFlag(country.toUpperCase());
}

export function eventCountryFromExternalKey(
  externalKey?: string | null
): SubcultureEventCountry | null {
  if (!externalKey) return null;
  const key = externalKey.toLowerCase();
  for (const c of SUBCULTURE_COUNTRY_CODES) {
    if (
      key.startsWith(`official-${c}-`) ||
      key.startsWith(`auto-${c}-`) ||
      key.startsWith(`auto-wiki-${c}-`) ||
      key.includes(`-${c}-`)
    ) {
      return c;
    }
  }
  if (
    key.startsWith("official-jp-") ||
    key.startsWith("venue-maid-jp-") ||
    key.startsWith("auto-comiket") ||
    key.startsWith("auto-wonfes") ||
    key.startsWith("auto-kyomaf") ||
    key.startsWith("auto-tgs")
  ) {
    return "jp";
  }
  if (key.startsWith("venue-maid-th-")) return "th";
  if (key.startsWith("venue-maid-tw-")) return "tw";
  if (key.startsWith("venue-maid-us-")) return "us";
  if (
    key.startsWith("venue-maid-") &&
    !key.includes("-jp-") &&
    !key.includes("-th-") &&
    !key.includes("-tw-") &&
    !key.includes("-us-")
  ) {
    return "kr";
  }
  if (
    key.startsWith("auto-comicw") ||
    key.startsWith("auto-gstar") ||
    key.startsWith("auto-seoulpopcon") ||
    key.startsWith("official-comicw") ||
    key.startsWith("official-gstar") ||
    key.startsWith("official-seoul")
  ) {
    return "kr";
  }
  if (
    key.startsWith("auto-animeexpo") ||
    key.startsWith("auto-comiccon") ||
    key.startsWith("official-us-")
  ) {
    return "us";
  }
  return null;
}

function nearestRegionByCoords(lat: number, lng: number): SubcultureEventCountryCode | null {
  let best: SubcultureEventCountryCode | null = null;
  let bestD = Infinity;
  for (const r of GLOBAL_DISCOVERY_REGIONS) {
    const d = (r.center.lat - lat) ** 2 + (r.center.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = r.country;
    }
  }
  return best;
}

export function inferEventCountryFromCoords(
  lat: number,
  lng: number,
  externalKey?: string | null
): SubcultureEventCountry {
  const fromKey = eventCountryFromExternalKey(externalKey);
  if (fromKey) return fromKey;

  if (lat >= 33 && lat <= 39.5 && lng >= 124 && lng <= 132) return "kr";
  if (lat >= 30 && lat <= 46 && lng >= 129 && lng <= 146) return "jp";
  if (lat >= 21.5 && lat <= 25.5 && lng >= 119 && lng <= 122.5) return "tw";
  if (lat >= 22 && lat <= 22.6 && lng >= 113.8 && lng <= 114.5) return "hk";
  if (lat >= 22.1 && lat <= 22.3 && lng >= 113.5 && lng <= 113.6) return "mo";
  if (lat >= 1 && lat <= 1.5 && lng >= 103.6 && lng <= 104.1) return "sg";
  if (lat >= 18 && lat <= 42 && lng >= 73 && lng <= 135) {
    if (lat >= 18 && lat <= 24 && lng >= 100 && lng <= 110) return "th";
    if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) return "vn";
    if (lat >= 18 && lat <= 42 && lng >= 73 && lng <= 135) return "cn";
  }
  if (lat >= 4.5 && lat <= 21.5 && lng >= 116 && lng <= 127) return "ph";
  if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) return "id";
  if (lat >= 49 && lat <= 61 && lng >= -8.5 && lng <= 2) return "gb";
  if (lat >= 47 && lat <= 55 && lng >= 5.5 && lng <= 15.5) return "de";
  if (lat >= 41 && lat <= 51.5 && lng >= -5.5 && lng <= 10) return "fr";
  if (lat >= 36 && lat <= 44 && lng >= -10 && lng <= 5) return "es";
  if (lat >= 36 && lat <= 47 && lng >= 6 && lng <= 19) return "it";
  if (lat >= 41 && lat <= 82 && lng >= 19 && lng <= 180) return "ru";
  if (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) return "us";
  if (lat >= 41 && lat <= 84 && lng >= -141 && lng <= -52) return "ca";
  if (lat >= -35 && lat <= -10 && lng >= 112 && lng <= 180) return "au";
  if (lat >= -47 && lat <= -34 && lng >= 166 && lng <= 179) return "nz";
  if (lat >= -35 && lat <= 5 && lng >= -75 && lng <= -34) return "br";
  if (lat >= 14 && lat <= 33 && lng >= -118 && lng <= -86) return "mx";
  if (lat >= -55 && lat <= -21 && lng >= -75 && lng <= -53) return "ar";
  if (lat >= -56 && lat <= -17 && lng >= -76 && lng <= -66) return "cl";
  if (lat >= -35 && lat <= 25 && lng >= 24 && lng <= 36) return "za";
  if (lat >= 22 && lat <= 32 && lng >= 34 && lng <= 56) return "ae";

  return nearestRegionByCoords(lat, lng) ?? "other";
}

export function resolveSubculturePinsForUser<T extends { country: SubcultureEventCountry }>(
  pins: T[],
  userCountryCode: string
): T[] {
  const target = userCountryToEventCountry(userCountryCode);
  const local = pins.filter((p) => p.country === target);
  if (local.length > 0) return local;
  if (target === "other") {
    return pins.slice(0, 48);
  }
  return local;
}

export function subcultureCountrySummary(userCountryCode: string, locale: Locale = "ko"): string {
  const target = userCountryToEventCountry(userCountryCode);
  const label = eventCountryDisplayLabel(target, locale);
  const flag = eventCountryFlag(target);
  if (locale === "en") return `${flag} ${label} subculture events — official auto-sync`;
  if (locale === "ja") return `${flag} ${label}のサブカルイベント — 公式自動収集`;
  if (locale === "zh") return `${flag} ${label}亚文化·动漫活动 — 官网自动同步`;
  return `${flag} ${label} 서브컬처·애니 행사 — 공식 사이트 자동 수집`;
}

export function isKoreaEventCountry(country: SubcultureEventCountry): boolean {
  return country === "kr";
}

export function isSupportedUserCountry(code: string): boolean {
  return COUNTRIES.some((c) => c.code === code.toUpperCase());
}

export function getSubcultureMapDefaultView(userCountryCode: string) {
  return SUBCULTURE_MAP_DEFAULTS[userCountryToEventCountry(userCountryCode)];
}
