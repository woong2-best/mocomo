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
  kr: "Korea",
  us: "United States",
  jp: "Japan",
  cn: "China",
  tw: "Taiwan",
  th: "Thailand",
  vn: "Vietnam",
  ph: "Philippines",
  id: "Indonesia",
  sg: "Singapore",
  my: "Malaysia",
  la: "Laos",
  kh: "Cambodia",
  mm: "Myanmar",
  bn: "Brunei",
  hk: "Hong Kong",
  mo: "Macao",
  gb: "United Kingdom",
  fr: "France",
  de: "Germany",
  es: "Spain",
  it: "Italy",
  ru: "Russia",
  ca: "Canada",
  br: "Brazil",
  mx: "Mexico",
  ar: "Argentina",
  cl: "Chile",
  co: "Colombia",
  pe: "Peru",
  au: "Australia",
  nz: "New Zealand",
  fi: "Finland",
  se: "Sweden",
  no: "Norway",
  dk: "Denmark",
  pl: "Poland",
  ro: "Romania",
  hu: "Hungary",
  cz: "Czech Republic",
  at: "Austria",
  ch: "Switzerland",
  nl: "Netherlands",
  be: "Belgium",
  pt: "Portugal",
  gr: "Greece",
  ua: "Ukraine",
  tr: "Turkey",
  sa: "Saudi Arabia",
  ae: "United Arab Emirates",
  il: "Israel",
  za: "South Africa",
  other: "Global",
};

const EVENT_COUNTRY_ISO: Record<SubcultureEventCountry, string> = Object.fromEntries(
  SUBCULTURE_EVENT_COUNTRIES.map((c) => [c, c === "other" ? "OTHER" : c.toUpperCase()])
) as Record<SubcultureEventCountry, string>;

export function eventCountryDisplayLabel(country: SubcultureEventCountry, locale: Locale): string {
  if (country === "other") {
    
    
    
    return "Global";
  }
  const nameLocale = "en";
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
  if (key.startsWith("venue-maid-gb-")) return "gb";
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

/** 사이드바 — 행사 N개 + 상설 메이드 카페는 항상 지도에 포함 */
export function selectSidebarEventPins<T extends { category: string }>(
  pins: T[],
  eventLimit = 12
): T[] {
  const maidPins = pins.filter((p) => p.category === "maid_cafe");
  const eventPins = pins.filter((p) => p.category !== "maid_cafe").slice(0, eventLimit);
  return [...eventPins, ...maidPins];
}

export function subcultureCountrySummary(userCountryCode: string, locale: Locale = "ko"): string {
  const target = userCountryToEventCountry(userCountryCode);
  const label = eventCountryDisplayLabel(target, locale);
  const flag = eventCountryFlag(target);
  return `${flag} ${label} subculture events — official auto-sync`;
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

/** /events/map 지구본 초기 뷰 — 전 세계 핀 + 사용자 국가가 화면 중앙 쪽을 향함 */
export function getSubcultureGlobeInitialView(userCountryCode: string): {
  lat: number;
  lng: number;
  zoom: number;
} {
  const { lat, lng } = SUBCULTURE_MAP_DEFAULTS[userCountryToEventCountry(userCountryCode)];
  return { lat, lng, zoom: 1.55 };
}
