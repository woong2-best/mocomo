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
  { code: "US", name: "United States (US)" },
  { code: "JP", name: "Japan (JP)" },
  { code: "CA", name: "Canada (CA)" },
  { code: "GB", name: "United Kingdom (GB)" },
  { code: "AU", name: "Australia (AU)" },
  { code: "NZ", name: "New Zealand (NZ)" },
  { code: "SG", name: "Singapore (SG)" },
  { code: "HK", name: "Hong Kong (HK)" },
  { code: "MY", name: "Malaysia (MY)" },
  { code: "MX", name: "Mexico (MX)" },
  { code: "BR", name: "Brazil (BR)" },
  { code: "DE", name: "Germany (DE)" },
  { code: "FR", name: "France (FR)" },
  { code: "IT", name: "Italy (IT)" },
  { code: "ES", name: "Spain (ES)" },
  { code: "NL", name: "Netherlands (NL)" },
  { code: "BE", name: "Belgium (BE)" },
  { code: "AT", name: "Austria (AT)" },
  { code: "CH", name: "Switzerland (CH)" },
  { code: "SE", name: "Sweden (SE)" },
  { code: "NO", name: "Norway (NO)" },
  { code: "FI", name: "Finland (FI)" },
  { code: "IE", name: "Ireland (IE)" },
  { code: "DK", name: "Denmark (DK)" },
  { code: "PT", name: "Portugal (PT)" },
  { code: "PL", name: "Poland (PL)" },
  { code: "CZ", name: "Czech Republic (CZ)" },
  { code: "HU", name: "Hungary (HU)" },
  { code: "RO", name: "Romania (RO)" },
  { code: "GR", name: "Greece (GR)" },
  { code: "HR", name: "Croatia (HR)" },
  { code: "SK", name: "Slovakia (SK)" },
  { code: "SI", name: "Slovenia (SI)" },
  { code: "BG", name: "Bulgaria (BG)" },
  { code: "LT", name: "Lithuania (LT)" },
  { code: "LV", name: "Latvia (LV)" },
  { code: "EE", name: "Estonia (EE)" },
  { code: "LU", name: "Luxembourg (LU)" },
  { code: "CY", name: "Cyprus (CY)" },
  { code: "MT", name: "Malta (MT)" },
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
    return { error: "Select the country of the account that will receive payouts." };
  }
  if (country === "KR") {
    return {
      error:
        "Payout connections cannot be created with a Korea (KR) account. Select a country where you have a payout account (e.g., United States US).",
    };
  }
  if (!isExpressPayoutCountry(country)) {
    return { error: "Stripe Express payouts are not supported in this country." };
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
