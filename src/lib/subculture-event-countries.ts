import { COUNTRIES, countryDisplayName, countryFlag, type Locale } from "@/lib/i18n/config";

/** 서브컬처 행사 국가 코드 (ISO 3166-1 alpha-2 소문자) */
export type SubcultureEventCountry =
  | "kr"
  | "us"
  | "jp"
  | "cn"
  | "tw"
  | "th"
  | "vn"
  | "ph"
  | "id"
  | "gb"
  | "de"
  | "fr"
  | "ca"
  | "au"
  | "other";

export const SUBCULTURE_EVENT_COUNTRIES: SubcultureEventCountry[] = [
  "kr",
  "us",
  "jp",
  "cn",
  "tw",
  "th",
  "vn",
  "ph",
  "id",
  "gb",
  "de",
  "fr",
  "ca",
  "au",
  "other",
];

const USER_TO_EVENT: Record<string, SubcultureEventCountry> = {
  KR: "kr",
  US: "us",
  JP: "jp",
  CN: "cn",
  TW: "tw",
  TH: "th",
  VN: "vn",
  PH: "ph",
  ID: "id",
  GB: "gb",
  DE: "de",
  FR: "fr",
  CA: "ca",
  AU: "au",
  OTHER: "other",
};

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
  gb: "영국",
  de: "독일",
  fr: "프랑스",
  ca: "캐나다",
  au: "호주",
  other: "글로벌",
};

const EVENT_COUNTRY_ISO: Record<SubcultureEventCountry, string> = {
  kr: "KR",
  us: "US",
  jp: "JP",
  cn: "CN",
  tw: "TW",
  th: "TH",
  vn: "VN",
  ph: "PH",
  id: "ID",
  gb: "GB",
  de: "DE",
  fr: "FR",
  ca: "CA",
  au: "AU",
  other: "OTHER",
};

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

/** 지도 기본 뷰 — 해당 국가 행사가 없을 때 */
export const SUBCULTURE_MAP_DEFAULTS: Record<
  SubcultureEventCountry,
  { lat: number; lng: number; zoom: number }
> = {
  kr: { lat: 36.5, lng: 127.8, zoom: 7 },
  us: { lat: 39.8, lng: -98.5, zoom: 4 },
  jp: { lat: 36.2, lng: 138.2, zoom: 5 },
  cn: { lat: 35.0, lng: 105.0, zoom: 4 },
  tw: { lat: 23.7, lng: 121.0, zoom: 7 },
  th: { lat: 13.7, lng: 100.5, zoom: 6 },
  vn: { lat: 16.0, lng: 108.0, zoom: 5 },
  ph: { lat: 12.8, lng: 122.0, zoom: 5 },
  id: { lat: -2.5, lng: 118.0, zoom: 4 },
  gb: { lat: 54.0, lng: -2.5, zoom: 6 },
  de: { lat: 51.2, lng: 10.4, zoom: 6 },
  fr: { lat: 46.6, lng: 2.2, zoom: 6 },
  ca: { lat: 56.0, lng: -96.0, zoom: 4 },
  au: { lat: -25.3, lng: 133.8, zoom: 4 },
  other: { lat: 20.0, lng: 0.0, zoom: 2 },
};

export function userCountryToEventCountry(userCountryCode: string): SubcultureEventCountry {
  const code = userCountryCode.toUpperCase();
  return USER_TO_EVENT[code] ?? "other";
}

export function eventCountryFlag(country: SubcultureEventCountry): string {
  if (country === "other") return "🌐";
  return countryFlag(country.toUpperCase());
}

export function eventCountryFromExternalKey(externalKey?: string | null): SubcultureEventCountry | null {
  if (!externalKey) return null;
  const key = externalKey.toLowerCase();
  for (const c of SUBCULTURE_EVENT_COUNTRIES) {
    if (c === "other") continue;
    if (
      key.startsWith(`official-${c}-`) ||
      key.startsWith(`auto-${c}-`) ||
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
  if (key.startsWith("venue-maid-") && !key.includes("-jp-") && !key.includes("-th-") && !key.includes("-tw-") && !key.includes("-us-")) {
    return "kr";
  }
  if (key.startsWith("auto-comicw") || key.startsWith("auto-gstar") || key.startsWith("auto-seoulpopcon") || key.startsWith("official-comicw") || key.startsWith("official-gstar") || key.startsWith("official-seoul")) {
    return "kr";
  }
  if (key.startsWith("auto-animeexpo") || key.startsWith("auto-comiccon") || key.startsWith("official-us-")) {
    return "us";
  }
  return null;
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
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
    if (lat >= 18 && lat <= 24 && lng >= 100 && lng <= 110) return "th";
    if (lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110) return "vn";
    if (lat >= 18 && lat <= 42 && lng >= 73 && lng <= 135) return "cn";
  }
  if (lat >= 4.5 && lat <= 21.5 && lng >= 116 && lng <= 127) return "ph";
  if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) return "id";
  if (lat >= 49 && lat <= 61 && lng >= -8.5 && lng <= 2) return "gb";
  if (lat >= 47 && lat <= 55 && lng >= 5.5 && lng <= 15.5) return "de";
  if (lat >= 41 && lat <= 51.5 && lng >= -5.5 && lng <= 10) return "fr";
  if (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) return "us";
  if (lat >= 41 && lat <= 84 && lng >= -141 && lng <= -52) return "ca";
  if (lat >= -44 && lat <= -10 && lng >= 112 && lng <= 154) return "au";

  return lng >= 132 ? "jp" : "kr";
}

export function resolveSubculturePinsForUser<T extends { country: SubcultureEventCountry }>(
  pins: T[],
  userCountryCode: string
): T[] {
  const target = userCountryToEventCountry(userCountryCode);
  const local = pins.filter((p) => p.country === target);
  if (local.length > 0) return local;
  if (target === "other") {
    const majors: SubcultureEventCountry[] = ["kr", "jp", "us"];
    return pins.filter((p) => majors.includes(p.country)).slice(0, 24);
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

/** 회원가입·설정 국가 목록과 동기화 */
export function isSupportedUserCountry(code: string): boolean {
  return COUNTRIES.some((c) => c.code === code.toUpperCase());
}

export function getSubcultureMapDefaultView(userCountryCode: string) {
  return SUBCULTURE_MAP_DEFAULTS[userCountryToEventCountry(userCountryCode)];
}
