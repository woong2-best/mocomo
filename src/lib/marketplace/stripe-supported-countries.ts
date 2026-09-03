/**
 * Stripe-supported countries for Star Market — synced from Stripe country_specs API.
 * Independent from OFAC lists (intersection applied in market-access).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { safeLogInfo, safeLogWarn } from "@/lib/safe-log";

const CACHE_REL_PATH = join("data", "compliance", "stripe-supported-countries.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Product policy — Stripe may support KR; Star Market buyer/seller checkout stays off until launch */
export const STAR_MARKET_PRODUCT_EXCLUDED_COUNTRIES = new Set<string>(["KR"]);

/** Baseline when API + cache unavailable (matches pre-sync hardcoded list) */
export const STRIPE_SUPPORTED_COUNTRIES_BASELINE = [
  "US", "CA", "GB", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "IE", "PT", "FI", "SE", "NO", "DK",
  "PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "LT", "LV", "EE", "LU", "MT", "CY", "GR",
  "AU", "NZ", "SG", "HK", "JP", "MX", "BR", "AE", "IL", "IN", "MY", "TH", "PH", "TW",
] as const;

type CountryCacheFile = {
  syncedAt: string;
  source: string;
  countries: string[];
};

let memoryCache: { countries: Set<string>; syncedAt: number; source: string } | null = null;

function cacheFilePath(): string {
  return join(process.cwd(), CACHE_REL_PATH);
}

function readCacheFile(): CountryCacheFile | null {
  try {
    const path = cacheFilePath();
    if (!existsSync(path)) return null;
    const raw = JSON.parse(readFileSync(path, "utf8")) as CountryCacheFile;
    if (!Array.isArray(raw.countries) || raw.countries.length === 0) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeCacheFile(payload: CountryCacheFile): void {
  try {
    const path = cacheFilePath();
    mkdirSync(join(process.cwd(), "data", "compliance"), { recursive: true });
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch (e) {
    safeLogWarn("stripe-country-sync", { err: String(e), note: "cache_write_skipped" });
  }
}

function applyMemory(countries: string[], source: string, syncedAtMs: number) {
  memoryCache = {
    countries: new Set(countries.map((c) => c.trim().toUpperCase()).filter(Boolean)),
    syncedAt: syncedAtMs,
    source,
  };
}

function loadBaselineToMemory() {
  applyMemory([...STRIPE_SUPPORTED_COUNTRIES_BASELINE], "baseline", 0);
}

function ensureMemoryLoaded() {
  if (memoryCache) return;
  const file = readCacheFile();
  if (file) {
    applyMemory(file.countries, file.source, Date.parse(file.syncedAt) || 0);
    return;
  }
  loadBaselineToMemory();
}

/** Synchronous read — uses memory/disk/baseline (call syncStripeSupportedCountries to refresh). */
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

export async function syncStripeSupportedCountriesFromApi(): Promise<{
  ok: true;
  count: number;
  added: string[];
  removed: string[];
  source: string;
} | { ok: false; error: string }> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe not configured" };
  }

  const before = getStripeSupportedCountriesSync();
  const stripe = getStripe();
  const collected = new Set<string>();

  try {
    let startingAfter: string | undefined;
    for (let page = 0; page < 20; page += 1) {
      const res = await stripe.countrySpecs.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const spec of res.data) {
        if (spec.id?.trim()) collected.add(spec.id.trim().toUpperCase());
      }
      if (!res.has_more || res.data.length === 0) break;
      startingAfter = res.data[res.data.length - 1]?.id;
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe country_specs failed" };
  }

  if (collected.size === 0) {
    return { ok: false, error: "Stripe returned zero country specs" };
  }

  const countries = [...collected].sort();
  const now = Date.now();
  applyMemory(countries, "stripe_api", now);
  writeCacheFile({
    syncedAt: new Date(now).toISOString(),
    source: "stripe_api",
    countries,
  });

  const after = getStripeSupportedCountriesSync();
  const added = [...after].filter((c) => !before.has(c)).sort();
  const removed = [...before].filter((c) => !after.has(c)).sort();

  safeLogInfo("stripe-country-sync", { count: countries.length, added: added.length, removed: removed.length });

  return { ok: true, count: countries.length, added, removed, source: "stripe_api" };
}

/** Refresh if stale — safe to call from request handlers */
export async function ensureStripeSupportedCountriesFresh(): Promise<void> {
  ensureMemoryLoaded();
  if (memoryCache && Date.now() - memoryCache.syncedAt < CACHE_TTL_MS) return;
  if (!isStripeConfigured()) return;
  await syncStripeSupportedCountriesFromApi().catch(() => null);
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
