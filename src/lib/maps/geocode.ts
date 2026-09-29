import { getSidoById, parseUsedRegion } from "@/lib/korea-regions";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import {
  nominatimReverse,
  nominatimSearchPlace,
  nominatimSearchPlaces,
} from "@/lib/maps/nominatim";

export type GeocodeResult = { lat: number; lng: number; label: string };

const EN_SIDO_ALIASES: Record<string, string[]> = {
  seoul: ["Seoul"],
  busan: ["Busan"],
  daegu: ["Daegu"],
  incheon: ["Incheon"],
  gwangju: ["Gwangju"],
  daejeon: ["Daejeon"],
  ulsan: ["Ulsan"],
  sejong: ["Sejong"],
  gyeonggi: ["Gyeonggi"],
  gangwon: ["Gangwon"],
  chungbuk: ["North Chungcheong", "Chungcheongbuk"],
  chungnam: ["South Chungcheong", "Chungcheongnam"],
  jeonbuk: ["North Jeolla", "Jeollabuk"],
  jeonnam: ["South Jeolla", "Jeollanam"],
  gyeongbuk: ["North Gyeongsang", "Gyeongsangbuk"],
  gyeongnam: ["South Gyeongsang", "Gyeongsangnam"],
  jeju: ["Jeju"],
};

function sigunguTokens(sigungu: string): string[] {
  const parts = sigungu
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [sigungu.trim()];
}

/** Nominatim label (KO/EN) matches MoCoMo used-market region like `부산 수영구`. */
export function meetGeocodeLabelMatchesRegion(label: string, region: string): boolean {
  const hay = label.trim();
  const trimmedRegion = region.trim();
  if (!trimmedRegion) return true;

  const parsed = parseUsedRegion(trimmedRegion);
  if (!parsed || parsed.sidoId === "__shipping__") {
    return trimmedRegion
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => hay.includes(token));
  }

  const sido = getSidoById(parsed.sidoId);
  const sigunguOk = sigunguTokens(parsed.sigungu).every((token) => hay.includes(token));
  if (!sigunguOk) return false;
  if (!sido) return true;

  if (hay.includes(sido.short) || hay.includes(sido.label)) return true;
  for (const en of EN_SIDO_ALIASES[sido.id] ?? []) {
    if (hay.includes(en)) return true;
  }
  return false;
}

function buildScopedQueries(
  q: string,
  region: string,
  place: string,
  country: string | null | undefined
): string[] {
  const base = q.trim();
  if (!base) return [];

  const isKr = country?.toUpperCase() === "KR";
  const countryTag = isKr ? "대한민국" : "";
  const contexts: string[] = [];

  const parsed = parseUsedRegion(region);
  if (parsed && parsed.sidoId !== "__shipping__") {
    const sido = getSidoById(parsed.sidoId);
    const sigungu = place.trim() || parsed.sigungu;
    if (sido) {
      contexts.push(`${sido.label} ${sigungu}`);
      contexts.push(`${sido.short} ${sigungu}`);
    }
    contexts.push(region.trim());
  } else if (region.trim()) {
    contexts.push(region.trim());
  }
  if (place.trim() && !contexts.some((c) => c.includes(place.trim()))) {
    contexts.push(place.trim());
  }

  const variants = new Set<string>();
  for (const ctx of contexts) {
    variants.add(`${base}, ${ctx}${countryTag ? `, ${countryTag}` : ""}`);
    variants.add(`${base} ${ctx}${countryTag ? ` ${countryTag}` : ""}`);
  }
  if (!region.trim() && !place.trim()) {
    variants.add(base);
  }
  return [...variants];
}

async function searchWithinRegionScope(opts: {
  q: string;
  region: string;
  place: string;
  country?: string | null;
}): Promise<GeocodeResult | null> {
  const region = opts.region.trim();
  const place = opts.place.trim();
  if (!region && !place) {
    return nominatimSearchPlace(opts.q);
  }

  const isKr = opts.country?.toUpperCase() === "KR";
  const countryCodes = isKr ? "kr" : undefined;
  const queries = buildScopedQueries(opts.q, region, place, opts.country);

  for (const query of queries) {
    const rows = await nominatimSearchPlaces(query, 8, { countryCodes });
    const match = rows.find((row) => meetGeocodeLabelMatchesRegion(row.label, region || place));
    if (match) return match;
  }
  return null;
}

export async function geocodeMeetQuery(opts: {
  country?: string | null;
  region?: string;
  place?: string;
  q?: string;
}): Promise<GeocodeResult | null> {
  const country = normalizeMeetCountry(opts.country);
  const q = (opts.q ?? "").trim();
  const region = (opts.region ?? "").trim();
  const place = (opts.place ?? "").trim();

  if (q) {
    return searchWithinRegionScope({ q, region, place, country });
  }
  if (place) {
    if (region) {
      return searchWithinRegionScope({ q: place, region, place: "", country });
    }
    return nominatimSearchPlace(place);
  }
  if (!region) return null;
  return nominatimSearchPlace(region);
}

export async function reverseGeocodeMeet(opts: {
  country?: string | null;
  lat: number;
  lng: number;
}): Promise<GeocodeResult | null> {
  normalizeMeetCountry(opts.country);
  return nominatimReverse(opts.lat, opts.lng);
}
