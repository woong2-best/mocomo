export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

export {
  isKakaoLocalConfigured,
  KakaoLocalNotConfiguredError,
  kakaoCoordToAddress,
  kakaoGeocodeMeetPlace as geocodeMeetPlace,
  kakaoSearchPlace,
} from "@/lib/kakao-local";

export type { KakaoCoord } from "@/lib/kakao-local";
