import { geocodeMeetQuery } from "@/lib/maps/geocode";
import { meetExternalMapUrl, meetMapCaption } from "@/lib/maps/external-url";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import type { MeetMapPayload } from "@/lib/maps/types";
import { getRegionMapCenter, isShippingOnlyRegion } from "@/lib/used-region-coords";

function finiteCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export type ListingMeetMapInput = {
  region: string;
  meetPlace?: string | null;
  meetLat?: unknown;
  meetLng?: unknown;
  meetCountry?: string | null;
  sellerCountryCode?: string | null;
  /** When true, geocode meetPlace if coordinates are missing (detail views). */
  resolveGeocode?: boolean;
};

/** Same map object shape as mobile `GET /api/mobile/marketplace/[id]`. */
export async function buildListingMeetMapPayload(
  input: ListingMeetMapInput
): Promise<MeetMapPayload | null> {
  const region = input.region ?? "";
  const shipping = isShippingOnlyRegion(region);
  if (shipping) return null;

  const meetPlace =
    typeof input.meetPlace === "string" && input.meetPlace.trim()
      ? input.meetPlace.trim()
      : null;

  let meetLat = finiteCoord(input.meetLat);
  let meetLng = finiteCoord(input.meetLng);

  const meetCountry = normalizeMeetCountry(
    input.meetCountry ?? input.sellerCountryCode ?? null
  );

  if (input.resolveGeocode && (meetLat == null || meetLng == null) && meetPlace) {
    try {
      const geo = await geocodeMeetQuery({
        country: meetCountry,
        region,
        place: meetPlace,
      });
      if (geo) {
        meetLat = geo.lat;
        meetLng = geo.lng;
      }
    } catch {
      /* keep null */
    }
  }

  const hasPin = meetLat != null && meetLng != null;
  if (!hasPin && !region.trim()) return null;

  const regionCenter = getRegionMapCenter(region || "Seoul", meetCountry);
  const mapLat = hasPin ? meetLat! : regionCenter.lat;
  const mapLng = hasPin ? meetLng! : regionCenter.lng;
  const mapLabel = meetPlace || region || "Meetup location";
  const coords = hasPin ? { lat: meetLat!, lng: meetLng! } : null;

  return {
    label: mapLabel,
    lat: mapLat,
    lng: mapLng,
    hasPin,
    country: meetCountry,
    externalMapUrl: meetExternalMapUrl({
      country: meetCountry,
      region: region || mapLabel,
      place: meetPlace,
      coords,
    }),
    caption: meetMapCaption({
      country: meetCountry,
      region,
      hasPin,
    }),
  };
}
