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
    // Explicit search box query: try as-is, then region-biased fallback.
    if (q) {
      const direct = await kakaoSearchPlace(q);
      if (direct) return direct;
      if (region && !q.includes(region)) {
        return kakaoSearchPlace(`${q} ${region}`);
      }
      return null;
    }
    return kakaoGeocodeMeetPlace(region, place);
  }

  if (q) {
    const direct = await nominatimSearchPlace(q);
    if (direct) return direct;
    if (region && !q.includes(region)) {
      return nominatimSearchPlace(`${q} ${region}`);
    }
    return null;
  }
  if (place) {
    const direct = await nominatimSearchPlace(place);
    if (direct) return direct;
    if (region) return nominatimSearchPlace(`${place} ${region}`);
    return null;
  }
  if (!region) return null;
  return nominatimSearchPlace(region);
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
