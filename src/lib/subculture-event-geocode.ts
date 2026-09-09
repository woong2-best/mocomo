import type { SubcultureEventCountryCode } from "@/lib/subculture-event-global-config";
import { regionByCountry } from "@/lib/subculture-event-global-config";
import { nominatimSearchPlaceInCountry } from "@/lib/subculture-event-fetch/nominatim-country";
import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";

/** ISO 국가별 대략적 경계 — 핀 좌표 검증 */
const COUNTRY_BOUNDS: Record<
  SubcultureEventCountryCode,
  { minLat: number; maxLat: number; minLng: number; maxLng: number }
> = {
  kr: { minLat: 33, maxLat: 39.5, minLng: 124, maxLng: 132 },
  us: { minLat: 18, maxLat: 72, minLng: -180, maxLng: -66 },
  jp: { minLat: 24, maxLat: 46.5, minLng: 122, maxLng: 154 },
  cn: { minLat: 18, maxLat: 54, minLng: 73, maxLng: 135 },
  tw: { minLat: 21.5, maxLat: 26.5, minLng: 119, maxLng: 122.5 },
  th: { minLat: 5, maxLat: 21, minLng: 97, maxLng: 106 },
  vn: { minLat: 8, maxLat: 24, minLng: 102, maxLng: 110 },
  ph: { minLat: 4.5, maxLat: 21.5, minLng: 116, maxLng: 127 },
  id: { minLat: -11, maxLat: 6, minLng: 95, maxLng: 141 },
  sg: { minLat: 1.1, maxLat: 1.5, minLng: 103.6, maxLng: 104.1 },
  my: { minLat: 0.8, maxLat: 7.5, minLng: 99, maxLng: 119.5 },
  la: { minLat: 13.5, maxLat: 22.5, minLng: 100, maxLng: 108 },
  kh: { minLat: 10, maxLat: 15, minLng: 102, maxLng: 108 },
  mm: { minLat: 9.5, maxLat: 28.5, minLng: 92, maxLng: 101.5 },
  bn: { minLat: 4, maxLat: 5.2, minLng: 114, maxLng: 115.5 },
  hk: { minLat: 22.1, maxLat: 22.6, minLng: 113.8, maxLng: 114.5 },
  mo: { minLat: 22.1, maxLat: 22.25, minLng: 113.52, maxLng: 113.65 },
  gb: { minLat: 49.5, maxLat: 61, minLng: -8.5, maxLng: 2 },
  fr: { minLat: 41, maxLat: 51.5, minLng: -5.5, maxLng: 10 },
  de: { minLat: 47, maxLat: 55.5, minLng: 5.5, maxLng: 15.5 },
  es: { minLat: 36, maxLat: 44, minLng: -10, maxLng: 5 },
  it: { minLat: 36, maxLat: 47.5, minLng: 6, maxLng: 19 },
  ru: { minLat: 41, maxLat: 82, minLng: 19, maxLng: 180 },
  ca: { minLat: 41.5, maxLat: 84, minLng: -141, maxLng: -52 },
  br: { minLat: -34, maxLat: 5.5, minLng: -74, maxLng: -34 },
  mx: { minLat: 14, maxLat: 33, minLng: -118, maxLng: -86 },
  ar: { minLat: -55, maxLat: -21, minLng: -75, maxLng: -53 },
  cl: { minLat: -56, maxLat: -17, minLng: -76, maxLng: -66 },
  co: { minLat: -4.5, maxLat: 13.5, minLng: -82, maxLng: -66 },
  pe: { minLat: -19, maxLat: 0, minLng: -82, maxLng: -68 },
  au: { minLat: -44, maxLat: -10, minLng: 112, maxLng: 154 },
  nz: { minLat: -47.5, maxLat: -34, minLng: 166, maxLng: 179 },
  fi: { minLat: 59.5, maxLat: 70.5, minLng: 19, maxLng: 32 },
  se: { minLat: 55, maxLat: 69.5, minLng: 10, maxLng: 24.5 },
  no: { minLat: 57.5, maxLat: 71.5, minLng: 4, maxLng: 31.5 },
  dk: { minLat: 54.5, maxLat: 58, minLng: 8, maxLng: 13 },
  pl: { minLat: 49, maxLat: 55, minLng: 14, maxLng: 24.5 },
  ro: { minLat: 43.5, maxLat: 48.5, minLng: 20, maxLng: 30 },
  hu: { minLat: 45.5, maxLat: 48.5, minLng: 16, maxLng: 23 },
  cz: { minLat: 48.5, maxLat: 51.5, minLng: 12, maxLng: 19 },
  at: { minLat: 46.5, maxLat: 49.5, minLng: 9.5, maxLng: 17.5 },
  ch: { minLat: 45.5, maxLat: 48, minLng: 5.9, maxLng: 10.6 },
  nl: { minLat: 50.7, maxLat: 53.7, minLng: 3.3, maxLng: 7.3 },
  be: { minLat: 49.4, maxLat: 51.6, minLng: 2.5, maxLng: 6.5 },
  pt: { minLat: 36.8, maxLat: 42.2, minLng: -9.6, maxLng: -6.1 },
  gr: { minLat: 34.5, maxLat: 41.8, minLng: 19.3, maxLng: 29.7 },
  ua: { minLat: 44, maxLat: 52.5, minLng: 22, maxLng: 40.5 },
  tr: { minLat: 35.8, maxLat: 42.5, minLng: 25.5, maxLng: 45 },
  sa: { minLat: 16, maxLat: 32.5, minLng: 34.5, maxLng: 56 },
  ae: { minLat: 22.5, maxLat: 26.5, minLng: 51, maxLng: 56.5 },
  il: { minLat: 29.4, maxLat: 33.5, minLng: 34.2, maxLng: 35.9 },
  za: { minLat: -35, maxLat: -22, minLng: 16, maxLng: 33 },
};

const GENERIC_VENUE_TITLES = new Set([
  "comic book convention",
  "comic convention",
  "anime convention",
  "comic con",
  "fan convention",
  "anime festival",
  "comic festival",
  "manga convention",
  "cosplay convention",
]);

export function isGenericVenueTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (t.length < 5) return true;
  if (GENERIC_VENUE_TITLES.has(t)) return true;
  if (/^(list of|category:|index of|history of)\b/i.test(title)) return true;
  if (/^comic book convention$/i.test(t)) return true;
  return false;
}

export function isPinCoordinateValid(
  country: SubcultureEventCountry,
  lat: number,
  lng: number
): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (country === "other") return true;
  const box = COUNTRY_BOUNDS[country];
  if (!box) return true;
  return (
    lat >= box.minLat &&
    lat <= box.maxLat &&
    lng >= box.minLng &&
    lng <= box.maxLng
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Nominatim — 주소 우선, 국가 경계 검증 */
export async function geocodeEventVenueInCountry(
  country: SubcultureEventCountry,
  venueName: string | null | undefined,
  address: string | null | undefined
): Promise<{ lat: number; lng: number; label: string } | null> {
  if (country === "other") return null;
  const region = regionByCountry(country);
  if (!region) return null;

  const venue = venueName?.trim() ?? "";
  const addr = address?.trim() ?? "";
  if (!venue && !addr) return null;
  if (venue && isGenericVenueTitle(venue)) return null;

  const queries = [
    addr.length > 8 ? addr : null,
    venue && addr ? `${venue}, ${addr}` : null,
    venue ? `${venue}, ${region.iso.toUpperCase()}` : null,
  ].filter((q): q is string => Boolean(q?.trim()));

  const seen = new Set<string>();
  for (const q of queries) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const hit = await nominatimSearchPlaceInCountry(q, region.iso, region.acceptLanguage);
    if (hit && isPinCoordinateValid(country, hit.lat, hit.lng)) {
      return { lat: hit.lat, lng: hit.lng, label: hit.label };
    }
    await sleep(1100);
  }
  return null;
}
