import { KOREA_SIDO, parseUsedRegion, USED_SHIPPING_REGION } from "@/lib/korea-regions";

/** 시·도 대표 좌표 (지도 초기 중심) */
export const SIDO_CENTER: Record<string, { lat: number; lng: number; zoom: number }> = {
  seoul: { lat: 37.5665, lng: 126.978, zoom: 11 },
  busan: { lat: 35.1796, lng: 129.0756, zoom: 11 },
  daegu: { lat: 35.8714, lng: 128.6014, zoom: 11 },
  incheon: { lat: 37.4563, lng: 126.7052, zoom: 11 },
  gwangju: { lat: 35.1595, lng: 126.8526, zoom: 11 },
  daejeon: { lat: 36.3504, lng: 127.3845, zoom: 11 },
  ulsan: { lat: 35.5384, lng: 129.3114, zoom: 11 },
  sejong: { lat: 36.48, lng: 127.289, zoom: 12 },
  gyeonggi: { lat: 37.4138, lng: 127.5183, zoom: 10 },
  gangwon: { lat: 37.8228, lng: 128.1555, zoom: 9 },
  chungbuk: { lat: 36.6357, lng: 127.4912, zoom: 10 },
  chungnam: { lat: 36.5184, lng: 126.8, zoom: 10 },
  jeonbuk: { lat: 35.8242, lng: 127.148, zoom: 10 },
  jeonnam: { lat: 34.8679, lng: 126.991, zoom: 9 },
  gyeongbuk: { lat: 36.4919, lng: 128.8889, zoom: 9 },
  gyeongnam: { lat: 35.4606, lng: 128.2132, zoom: 10 },
  jeju: { lat: 33.4996, lng: 126.5312, zoom: 10 },
};

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978, zoom: 11 };

export function getRegionMapCenter(region: string): { lat: number; lng: number; zoom: number } {
  const trimmed = region.trim();
  if (trimmed === USED_SHIPPING_REGION) return DEFAULT_CENTER;
  const parsed = parseUsedRegion(trimmed);
  if (!parsed || parsed.sidoId === "__shipping__") return DEFAULT_CENTER;
  return SIDO_CENTER[parsed.sidoId] ?? DEFAULT_CENTER;
}

export function isShippingOnlyRegion(region: string): boolean {
  return region.trim() === USED_SHIPPING_REGION;
}
