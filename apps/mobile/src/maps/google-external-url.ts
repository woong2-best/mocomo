import type { MeetCoords } from "@/maps/types";

export function googleMapsExternalUrl(opts: {
  place?: string | null;
  region?: string | null;
  coords?: MeetCoords | null;
  fallbackQuery?: string;
}): string {
  const label = [opts.place?.trim(), opts.region?.trim()].filter(Boolean).join(" ");
  if (opts.coords && Number.isFinite(opts.coords.lat) && Number.isFinite(opts.coords.lng)) {
    const { lat, lng } = opts.coords;
    const q = label ? `${label} ${lat},${lng}` : `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    label || opts.fallbackQuery || "world"
  )}`;
}

/**
 * Marketplace meet query: selected region, then the address detail the seller typed.
 * Listing titles stay out of this string.
 */
export function marketplaceMeetLocationQuery(opts: {
  region?: string | null;
  place?: string | null;
}): string {
  const region = opts.region?.trim() ?? "";
  const place = opts.place?.trim() ?? "";
  if (!region) return place;
  if (!place || place === region) return region;
  if (place.startsWith(region)) return place;
  return `${region} ${place}`;
}

export function googleSearchUrlForMeet(opts: {
  place?: string | null;
  region?: string | null;
}): string {
  return `https://www.google.com/search?q=${encodeURIComponent(marketplaceMeetLocationQuery(opts))}`;
}

/** Google Maps search for a marketplace meet pin. Same text as web search, no product name or raw coordinates. */
export function marketplaceMeetMapUrl(opts: {
  region?: string | null;
  place?: string | null;
  coords?: MeetCoords | null;
}): string {
  const query = marketplaceMeetLocationQuery(opts);
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  if (opts.coords && Number.isFinite(opts.coords.lat) && Number.isFinite(opts.coords.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${opts.coords.lat},${opts.coords.lng}`
    )}`;
  }
  return "https://www.google.com/maps/search/?api=1&query=world";
}
