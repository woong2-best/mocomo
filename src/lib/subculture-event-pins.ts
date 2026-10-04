import type { SubcultureEventCountry } from "@/lib/subculture-event-seeds";
import { googleMapsExternalUrl } from "@/lib/maps/google-external-url";
import type { SubcultureEventPhase } from "@/lib/subculture-event-phase";
import { googleSearchUrlForMapPin } from "@/lib/subculture-venue-google-search";

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
  /** 진행 중 · 예정 · 상설 — 지도·목록 표시 */
  phase: SubcultureEventPhase;
  /** 장소·행사 대표 이미지 (팝업 미리보기) */
  imageUrl?: string | null;
  /** 로드뷰·거리뷰 정적 사진 URL (유료 API 대신 마커 데이터 사용) */
  roadViewImageUrl?: string | null;
};

export function googleSearchUrlForEvent(pin: MapEventPin): string {
  return googleSearchUrlForMapPin(pin);
}

export function mapLinkForEvent(pin: MapEventPin): { label: string; url: string } {
  return {
    label: "Google Maps",
    url: googleMapsExternalUrl({
      place: pin.venueName ?? pin.title,
      coords: { lat: pin.lat, lng: pin.lng },
    }),
  };
}
