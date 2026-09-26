import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import { googleMapsExternalUrl } from "@/lib/maps/google-external-url";
import type { MeetCoords } from "@/lib/maps/types";

/** Country-aware external map deep link (same for web + mobile clients). */
export function meetExternalMapUrl(opts: {
  country?: string | null;
  region?: string | null;
  place?: string | null;
  coords?: MeetCoords | null;
}): string {
  normalizeMeetCountry(opts.country);
  return googleMapsExternalUrl({
    place: opts.place,
    region: opts.region,
    coords: opts.coords,
    fallbackQuery: opts.region?.trim() || undefined,
  });
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
