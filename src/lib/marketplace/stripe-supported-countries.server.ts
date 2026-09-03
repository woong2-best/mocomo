import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { safeLogWarn } from "@/lib/safe-log";
import {
  applyStripeSupportedCountryCache,
  getStripeCountryCacheMeta,
  getStripeSupportedCountriesSync,
  logStripeCountrySync,
} from "@/lib/marketplace/stripe-supported-countries";

const CACHE_REL_PATH = join("data", "compliance", "stripe-supported-countries.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CountryCacheFile = {
  syncedAt: string;
  source: string;
  countries: string[];
};

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

/** Hydrate memory from disk when available (server cold start). */
export function hydrateStripeSupportedCountriesFromDisk(): void {
  const file = readCacheFile();
  if (!file) return;
  applyStripeSupportedCountryCache(
    file.countries,
    file.source,
    Date.parse(file.syncedAt) || 0
  );
}

export async function syncStripeSupportedCountriesFromApi(): Promise<
  | { ok: true; count: number; added: string[]; removed: string[]; source: string }
  | { ok: false; error: string }
> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe not configured" };
  }

  hydrateStripeSupportedCountriesFromDisk();
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
  applyStripeSupportedCountryCache(countries, "stripe_api", now);
  writeCacheFile({
    syncedAt: new Date(now).toISOString(),
    source: "stripe_api",
    countries,
  });

  const after = getStripeSupportedCountriesSync();
  const added = [...after].filter((c) => !before.has(c)).sort();
  const removed = [...before].filter((c) => !after.has(c)).sort();

  logStripeCountrySync(countries.length, added.length, removed.length);

  return { ok: true, count: countries.length, added, removed, source: "stripe_api" };
}

/** Refresh if stale — server routes / cron only */
export async function ensureStripeSupportedCountriesFresh(): Promise<void> {
  hydrateStripeSupportedCountriesFromDisk();
  const cache = getStripeCountryCacheMeta();
  if (cache.syncedAt && Date.now() - Date.parse(cache.syncedAt) < CACHE_TTL_MS) return;
  if (!isStripeConfigured()) return;
  await syncStripeSupportedCountriesFromApi().catch(() => null);
}
