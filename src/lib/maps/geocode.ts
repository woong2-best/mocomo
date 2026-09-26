import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import { nominatimReverse, nominatimSearchPlace } from "@/lib/maps/nominatim";

export type GeocodeResult = { lat: number; lng: number; label: string };

export async function geocodeMeetQuery(opts: {
  country?: string | null;
  region?: string;
  place?: string;
  q?: string;
}): Promise<GeocodeResult | null> {
  normalizeMeetCountry(opts.country);
  const q = (opts.q ?? "").trim();
  const region = (opts.region ?? "").trim();
  const place = (opts.place ?? "").trim();

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
  normalizeMeetCountry(opts.country);
  return nominatimReverse(opts.lat, opts.lng);
}
