import type { MeetCoords } from "@/lib/maps/types";

/** Google Maps deep link — same shape for web, mobile API, and event pins. */
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
