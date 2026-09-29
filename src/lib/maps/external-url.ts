import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import type { MeetCoords } from "@/lib/maps/types";

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

/** Country-aware external map deep link for marketplace meet pins. */
export function meetExternalMapUrl(opts: {
  country?: string | null;
  region?: string | null;
  place?: string | null;
  coords?: MeetCoords | null;
}): string {
  normalizeMeetCountry(opts.country);
  return marketplaceMeetMapUrl(opts);
}

export function googleSearchUrlForMeet(opts: {
  place?: string | null;
  region?: string | null;
}): string {
  return `https://www.google.com/search?q=${encodeURIComponent(marketplaceMeetLocationQuery(opts))}`;
}

export function meetMapCaption(opts: {
  country?: string | null;
  region?: string | null;
  hasPin: boolean;
}): string {
  const region = opts.region?.trim() || "";
  return opts.hasPin
    ? `${region} · 판매자가 입력한 거래 장소입니다`
    : `${region} · 정확한 핀이 없어 지역 중심으로 표시합니다`;
}
