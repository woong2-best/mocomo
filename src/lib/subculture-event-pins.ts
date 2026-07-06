import type { SubcultureEventCountry } from "@/lib/subculture-event-seeds";
import { isKoreaEventCountry } from "@/lib/subculture-event-countries";

export type MapEventPin = {
  id: string;
  title: string;
  country: SubcultureEventCountry;
  category: string;
  categoryLabel: string;
  venueName: string | null;
  description: string | null;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string | null;
  sourceUrl: string | null;
  source: string;
};

export function mapLinkForEvent(pin: MapEventPin): { label: string; url: string } {
  if (isKoreaEventCountry(pin.country)) {
    return {
      label: "카카오맵",
      url: `https://map.kakao.com/link/map/${pin.lat},${pin.lng}`,
    };
  }
  const q = encodeURIComponent(`${pin.venueName ?? pin.title} ${pin.lat},${pin.lng}`);
  return {
    label: "Google 지도",
    url: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}
