/**
 * Stripe-supported countries for Star Market — client-safe (no Node fs).
 * Committed JSON is bundled at build time; cron refreshes via .server module.
 */

import countryCacheFile from "../../../data/compliance/stripe-supported-countries.json";
import { safeLogInfo } from "@/lib/safe-log";

/** Product policy — Stripe may support KR; Star Market buyer/seller checkout stays off until launch */
export const STAR_MARKET_PRODUCT_EXCLUDED_COUNTRIES = new Set<string>(["KR"]);

/** Baseline when JSON cache unavailable */
export const STRIPE_SUPPORTED_COUNTRIES_BASELINE = [
  "US", "CA", "GB", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "IE", "PT", "FI", "SE", "NO", "DK",
  "PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "LT", "LV", "EE", "LU", "MT", "CY", "GR",
  "AU", "NZ", "SG", "HK", "JP", "MX", "BR", "AE", "IL", "IN", "MY", "TH", "PH", "TW",
] as const;

type CountryCacheFile = {
  syncedAt?: string;
  source?: string;
  countries?: string[];
};

let memoryCache: { countries: Set<string>; syncedAt: number; source: string } | null = null;

function normalizeCountryList(countries: string[]): string[] {
  return countries.map((c) => c.trim().toUpperCase()).filter(Boolean);
}

export function applyStripeSupportedCountryCache(
  countries: string[],
  source: string,
  syncedAtMs: number
): void {
  memoryCache = {
    countries: new Set(normalizeCountryList(countries)),
    syncedAt: syncedAtMs,
    source,
  };
}

function loadBaselineToMemory() {
  applyStripeSupportedCountryCache([...STRIPE_SUPPORTED_COUNTRIES_BASELINE], "baseline", 0);
}

function ensureMemoryLoaded() {
  if (memoryCache) return;
  const file = countryCacheFile as CountryCacheFile;
  const countries =
    Array.isArray(file.countries) && file.countries.length > 0
      ? file.countries
      : [...STRIPE_SUPPORTED_COUNTRIES_BASELINE];
  const syncedAt = file.syncedAt ? Date.parse(file.syncedAt) || 0 : 0;
  applyStripeSupportedCountryCache(countries, file.source ?? "json", syncedAt);
}

/** Synchronous read — bundled JSON + in-memory overrides from server sync. */
export function getStripeSupportedCountriesSync(): Set<string> {
  ensureMemoryLoaded();
  return new Set(memoryCache!.countries);
}

export function getStripeSupportedCountryList(): string[] {
  return [...getStripeSupportedCountriesSync()].sort();
}

/** Stripe Connect Express 셀프서브 가입이 되는 정산 계좌 국가. */
export const STRIPE_EXPRESS_SUPPORTED_COUNTRIES = [
  { code: "US", name: "미국 (US)" },
  { code: "JP", name: "일본 (JP)" },
  { code: "CA", name: "캐나다 (CA)" },
  { code: "GB", name: "영국 (GB)" },
  { code: "AU", name: "호주 (AU)" },
  { code: "NZ", name: "뉴질랜드 (NZ)" },
  { code: "SG", name: "싱가포르 (SG)" },
  { code: "HK", name: "홍콩 (HK)" },
  { code: "MY", name: "말레이시아 (MY)" },
  { code: "MX", name: "멕시코 (MX)" },
  { code: "BR", name: "브라질 (BR)" },
  { code: "DE", name: "독일 (DE)" },
  { code: "FR", name: "프랑스 (FR)" },
  { code: "IT", name: "이탈리아 (IT)" },
  { code: "ES", name: "스페인 (ES)" },
  { code: "NL", name: "네덜란드 (NL)" },
  { code: "BE", name: "벨기에 (BE)" },
  { code: "AT", name: "오스트리아 (AT)" },
  { code: "CH", name: "스위스 (CH)" },
  { code: "SE", name: "스웨덴 (SE)" },
  { code: "NO", name: "노르웨이 (NO)" },
  { code: "FI", name: "핀란드 (FI)" },
  { code: "IE", name: "아일랜드 (IE)" },
  { code: "DK", name: "덴마크 (DK)" },
  { code: "PT", name: "포르투갈 (PT)" },
  { code: "PL", name: "폴란드 (PL)" },
  { code: "CZ", name: "체코 (CZ)" },
  { code: "HU", name: "헝가리 (HU)" },
  { code: "RO", name: "루마니아 (RO)" },
  { code: "GR", name: "그리스 (GR)" },
  { code: "HR", name: "크로아티아 (HR)" },
  { code: "SK", name: "슬로바키아 (SK)" },
  { code: "SI", name: "슬로베니아 (SI)" },
  { code: "BG", name: "불가리아 (BG)" },
  { code: "LT", name: "리투아니아 (LT)" },
  { code: "LV", name: "라트비아 (LV)" },
  { code: "EE", name: "에스토니아 (EE)" },
  { code: "LU", name: "룩셈부르크 (LU)" },
  { code: "CY", name: "키프러스 (CY)" },
  { code: "MT", name: "몰타 (MT)" },
] as const;

const EXPRESS_PAYOUT_COUNTRY_CODES = new Set<string>(
  STRIPE_EXPRESS_SUPPORTED_COUNTRIES.map((country) => country.code)
);

/** Express 정산 계좌 국가. 프로필 거주국과 별개이며 KR은 transfers capability가 거절된다. */
export const DEFAULT_EXPRESS_PAYOUT_COUNTRY = "US";

export function listExpressPayoutCountries(): readonly { code: string; name: string }[] {
  return STRIPE_EXPRESS_SUPPORTED_COUNTRIES;
}

export function listExpressPayoutCountryCodes(): string[] {
  return STRIPE_EXPRESS_SUPPORTED_COUNTRIES.map((country) => country.code);
}

export function isExpressPayoutCountry(countryCode: string | null | undefined): boolean {
  const country = (countryCode ?? "").trim().toUpperCase();
  return EXPRESS_PAYOUT_COUNTRY_CODES.has(country);
}

export function resolveExpressPayoutCountry(raw: unknown): { country: string } | { error: string } {
  const country = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(country)) {
    return { error: "정산받을 계좌의 국가를 선택해 주세요." };
  }
  if (country === "KR") {
    return {
      error:
        "한국(KR) 계정으로는 정산 연동을 만들 수 없습니다. 정산 계좌가 있는 국가(미국 US 등)를 선택해 주세요.",
    };
  }
  if (!isExpressPayoutCountry(country)) {
    return { error: "Stripe Express 정산을 지원하지 않는 국가입니다." };
  }
  return { country };
}

export function getStripeCountryCacheMeta(): {
  source: string;
  syncedAt: string | null;
  count: number;
} {
  ensureMemoryLoaded();
  return {
    source: memoryCache!.source,
    syncedAt: memoryCache!.syncedAt > 0 ? new Date(memoryCache!.syncedAt).toISOString() : null,
    count: memoryCache!.countries.size,
  };
}

/** Star Market eligible = Stripe supported ∩ ¬comprehensive OFAC ∩ ¬product exclusions */
export function isCountryInStripeSupportedList(countryCode: string | null | undefined): boolean {
  const c = (countryCode ?? "").trim().toUpperCase();
  if (!c) return false;
  return getStripeSupportedCountriesSync().has(c);
}

export function isStarMarketProductExcluded(countryCode: string | null | undefined): boolean {
  const c = (countryCode ?? "").trim().toUpperCase();
  return STAR_MARKET_PRODUCT_EXCLUDED_COUNTRIES.has(c);
}

/** @internal — server cron logs after refresh */
export function logStripeCountrySync(count: number, added: number, removed: number): void {
  safeLogInfo("stripe-country-sync", { count, added, removed });
}
