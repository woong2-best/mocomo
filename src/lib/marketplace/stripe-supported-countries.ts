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
