import {
  isKakaoLocalConfigured,
  kakaoCoordToAddress,
  kakaoGeocodeMeetPlace,
  kakaoSearchPlace,
} from "@/lib/kakao-local";
import { isKakaoMapCountry, normalizeMeetCountry } from "@/lib/maps/select-engine";
import { nominatimReverse, nominatimSearchPlace } from "@/lib/maps/nominatim";

export type GeocodeResult = { lat: number; lng: number; label: string };

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

  if (isKakaoMapCountry(country)) {
    if (!isKakaoLocalConfigured()) return null;
    if (q) return kakaoSearchPlace(q);
    return kakaoGeocodeMeetPlace(region, place || q);
  }

  const query = q || [place, region].filter(Boolean).join(" ");
  if (!query) return null;
  return nominatimSearchPlace(query);
}

export async function reverseGeocodeMeet(opts: {
  country?: string | null;
  lat: number;
  lng: number;
}): Promise<GeocodeResult | null> {
  const country = normalizeMeetCountry(opts.country);
  if (isKakaoMapCountry(country)) {
    if (!isKakaoLocalConfigured()) return null;
    const label = await kakaoCoordToAddress(opts.lat, opts.lng);
    if (!label) return null;
    return { lat: opts.lat, lng: opts.lng, label };
  }
  return nominatimReverse(opts.lat, opts.lng);
}
