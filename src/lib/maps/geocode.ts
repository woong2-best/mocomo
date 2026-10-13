import { getSidoById, parseUsedRegion } from "@/lib/korea-regions";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import { isUsedShippingRegion } from "@/lib/used-regions-global";
import {
  nominatimReverse,
  nominatimSearchPlace,
  nominatimSearchPlaces,
  nominatimSearchPostal,
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

/** Whole-query postal code for the seller's country. Street fragments like `40-3` are not codes. */
export function normalizePostalQuery(country: string | null | undefined, raw: string): string | null {
  const cc = (country ?? "").trim().toUpperCase();
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 16) return null;
  if (/[가-힣]/.test(trimmed)) return null;

  const specific = POSTAL_NORMALIZERS[cc];
  if (specific) return specific(trimmed);

  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,12}[A-Za-z0-9]$/.test(trimmed)) return null;
  if (!/\d/.test(trimmed)) return null;
  if (/[A-Za-z]{5,}/.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

/**
 * Street address or multi-part admin address. These must not be glued onto the
 * currently selected district — a Busan road was dropped when the form still
 * had Seoul selected.
 */
export function queryIsSpecificLocation(raw: string): boolean {
  const s = raw.trim().replace(/\s+/g, " ");
  if (s.length < 4 || s.length > 180) return false;
  if (/[가-힣]{2,}(?:대로|로|길)\d*/.test(s)) return true;
  if (/\d+\s*번(?:안)?길/.test(s)) return true;
  const adminHits = s.match(/[가-힣]{1,}(?:특별자치도|특별자치시|특별시|광역시|시|군|구|읍|면|동)/g);
  if (adminHits && adminHits.length >= 2) return true;
  if (
    /\d/.test(s) &&
    /\b(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|place|plaza|court|ct)\b/i.test(s)
  ) {
    return true;
  }
  if (s.includes(",") && /\d/.test(s) && s.length >= 12) return true;
  return false;
}

const POSTAL_NORMALIZERS: Record<string, (raw: string) => string | null> = {
  KR: (raw) => {
    if (!/^[\d\s-]+$/.test(raw)) return null;
    const digits = raw.replace(/\D/g, "");
    return digits.length === 5 ? digits : null;
  },
  US: (raw) => {
    const m = raw.trim().match(/^(\d{5})(?:-(\d{4}))?$/);
    if (!m) return null;
    return m[2] ? `${m[1]}-${m[2]}` : m[1];
  },
  JP: (raw) => {
    const m = raw.trim().match(/^(\d{3})-?(\d{4})$/);
    return m ? `${m[1]}-${m[2]}` : null;
  },
  CN: (raw) => digitsOfLength(raw, 6),
  TW: (raw) => {
    if (!/^[\d\s-]+$/.test(raw)) return null;
    const digits = raw.replace(/\D/g, "");
    return digits.length === 3 || digits.length === 5 || digits.length === 6 ? digits : null;
  },
  GB: (raw) => {
    const compact = raw.trim().toUpperCase().replace(/\s+/g, "");
    const m = compact.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
    return m ? `${m[1]} ${m[2]}` : null;
  },
  CA: (raw) => {
    const compact = raw.trim().toUpperCase().replace(/\s+/g, "");
    const m = compact.match(/^([A-Z]\d[A-Z])(\d[A-Z]\d)$/);
    return m ? `${m[1]} ${m[2]}` : null;
  },
  AU: (raw) => digitsOfLength(raw, 4),
  NZ: (raw) => digitsOfLength(raw, 4),
  DE: (raw) => digitsOfLength(raw, 5),
  FR: (raw) => digitsOfLength(raw, 5),
  IT: (raw) => digitsOfLength(raw, 5),
  ES: (raw) => digitsOfLength(raw, 5),
  MX: (raw) => digitsOfLength(raw, 5),
  TH: (raw) => digitsOfLength(raw, 5),
  ID: (raw) => digitsOfLength(raw, 5),
  MY: (raw) => digitsOfLength(raw, 5),
  TR: (raw) => digitsOfLength(raw, 5),
  FI: (raw) => digitsOfLength(raw, 5),
  IN: (raw) => digitsOfLength(raw, 6),
  SG: (raw) => digitsOfLength(raw, 6),
  RU: (raw) => digitsOfLength(raw, 6),
  CO: (raw) => digitsOfLength(raw, 6),
  VN: (raw) => {
    if (!/^[\d\s-]+$/.test(raw)) return null;
    const digits = raw.replace(/\D/g, "");
    return digits.length === 5 || digits.length === 6 ? digits : null;
  },
  PH: (raw) => digitsOfLength(raw, 4),
  NO: (raw) => digitsOfLength(raw, 4),
  DK: (raw) => digitsOfLength(raw, 4),
  CH: (raw) => digitsOfLength(raw, 4),
  AT: (raw) => digitsOfLength(raw, 4),
  BE: (raw) => digitsOfLength(raw, 4),
  ZA: (raw) => digitsOfLength(raw, 4),
  SE: (raw) => {
    const compact = raw.trim().replace(/\s+/g, "");
    const m = compact.match(/^(\d{3})(\d{2})$/);
    return m ? `${m[1]} ${m[2]}` : null;
  },
  NL: (raw) => {
    const compact = raw.trim().toUpperCase().replace(/\s+/g, "");
    const m = compact.match(/^(\d{4})([A-Z]{2})$/);
    return m ? `${m[1]} ${m[2]}` : null;
  },
  BR: (raw) => {
    const compact = raw.trim().replace(/\s+/g, "");
    const m = compact.match(/^(\d{5})-?(\d{3})$/);
    return m ? `${m[1]}-${m[2]}` : null;
  },
  PT: (raw) => {
    const compact = raw.trim().replace(/\s+/g, "");
    const m = compact.match(/^(\d{4})-?(\d{3})$/);
    return m ? `${m[1]}-${m[2]}` : null;
  },
  PL: (raw) => {
    const compact = raw.trim().replace(/\s+/g, "");
    const m = compact.match(/^(\d{2})-?(\d{3})$/);
    return m ? `${m[1]}-${m[2]}` : null;
  },
  IE: (raw) => {
    const compact = raw.trim().toUpperCase().replace(/\s+/g, "");
    const m = compact.match(/^([A-Z]\d{2})([A-Z0-9]{4})$/);
    return m ? `${m[1]} ${m[2]}` : null;
  },
  CL: (raw) => digitsOfLength(raw, 7),
};

function digitsOfLength(raw: string, length: number): string | null {
  if (!/^[\d\s-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === length ? digits : null;
}

function acceptLanguageForCountry(country: string): string {
  if (country === "KR") return "ko,en";
  if (country === "JP") return "ja,en";
  if (country === "CN") return "zh-CN,en";
  if (country === "TW") return "zh-TW,en";
  return "en";
}

function locationQueryVariants(raw: string): string[] {
  const base = raw.trim().replace(/\s+/g, " ");
  if (!base) return [];
  const variants = [base];
  const noParen = base.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (noParen && noParen !== base) variants.push(noParen);
  return variants;
}

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

  const country = normalizeMeetCountry(opts.country);
  if (isUsedShippingRegion(region) && !place) {
    return searchInCountry(opts.q, country);
  }

  const countryCodes = /^[A-Z]{2}$/.test(country) ? country.toLowerCase() : undefined;
  const queries = buildScopedQueries(opts.q, region, place, opts.country);

  for (const query of queries) {
    const rows = await nominatimSearchPlaces(query, 8, {
      countryCodes,
      acceptLanguage: acceptLanguageForCountry(country),
    });
    const match = rows.find((row) => meetGeocodeLabelMatchesRegion(row.label, region || place));
    if (match) return match;
  }
  return null;
}

async function searchInCountry(query: string, country: string): Promise<GeocodeResult | null> {
  const cc = country.trim().toLowerCase();
  const countryCodes = /^[a-z]{2}$/.test(cc) ? cc : undefined;
  const acceptLanguage = acceptLanguageForCountry(country);
  for (const variant of locationQueryVariants(query)) {
    const rows = await nominatimSearchPlaces(variant, 5, { countryCodes, acceptLanguage });
    if (rows[0]) return rows[0];
  }
  return null;
}

async function geocodeFreeText(
  q: string,
  opts: { country: string; region: string; place: string; allowRegionScope: boolean }
): Promise<GeocodeResult | null> {
  const postal = normalizePostalQuery(opts.country, q);
  if (postal) {
    const byCode = await nominatimSearchPostal(postal, opts.country, {
      acceptLanguage: acceptLanguageForCountry(opts.country),
    });
    if (byCode) return byCode;
    return searchInCountry(postal, opts.country);
  }
  if (queryIsSpecificLocation(q)) {
    return searchInCountry(q, opts.country);
  }
  if (opts.allowRegionScope && (opts.region || opts.place)) {
    const scoped = await searchWithinRegionScope({
      q,
      region: opts.region,
      place: opts.place,
      country: opts.country,
    });
    if (scoped) return scoped;
  }
  return searchInCountry(q, opts.country);
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
    return geocodeFreeText(q, { country, region, place, allowRegionScope: true });
  }
  if (place) {
    const specific =
      Boolean(normalizePostalQuery(country, place)) || queryIsSpecificLocation(place);
    if (specific || !region || isUsedShippingRegion(region)) {
      return geocodeFreeText(place, { country, region, place: "", allowRegionScope: false });
    }
    return searchWithinRegionScope({ q: place, region, place: "", country });
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
