declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        Map: new (
          container: HTMLElement,
          options: { center: KakaoLatLng; level: number }
        ) => KakaoMap;
        Marker: new (options: { position: KakaoLatLng; map?: KakaoMap | null }) => KakaoMarker;
        event: {
          addListener: (target: unknown, type: string, handler: (...args: unknown[]) => void) => void;
        };
        ControlPosition: { TOPRIGHT: number };
        ZoomControl: new () => unknown;
      };
    };
  }
}

type KakaoLatLng = { getLat: () => number; getLng: () => number };
type KakaoMap = {
  setCenter: (latlng: KakaoLatLng) => void;
  setLevel: (level: number) => void;
  getLevel: () => number;
  relayout: () => void;
  addControl: (control: unknown, position: number) => void;
};
type KakaoMarker = {
  setPosition: (latlng: KakaoLatLng) => void;
  setMap: (map: KakaoMap | null) => void;
};

let loading: Promise<NonNullable<typeof window.kakao>> | null = null;

export function getKakaoJsKey(): string {
  return process.env.NEXT_PUBLIC_KAKAO_JS_KEY?.trim() || "";
}

export function getKakaoMapsNamespace(): NonNullable<typeof window.kakao>["maps"] | null {
  if (typeof window === "undefined") return null;
  return window.kakao?.maps ?? null;
}

export function loadKakaoMapsSdk(): Promise<NonNullable<typeof window.kakao>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps requires a browser"));
  }
  if (window.kakao?.maps) {
    return new Promise((resolve) => {
      window.kakao!.maps.load(() => resolve(window.kakao!));
    });
  }
  const key = getKakaoJsKey();
  if (!key) {
    return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다."));
  }
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
      script.async = true;
      script.onload = () => {
        if (!window.kakao?.maps) {
          reject(new Error("Kakao Maps SDK failed to load"));
          return;
        }
        window.kakao.maps.load(() => resolve(window.kakao!));
      };
      script.onerror = () => reject(new Error("Kakao Maps SDK script error"));
      document.head.appendChild(script);
    });
  }
  return loading;
}

export type { KakaoLatLng, KakaoMap, KakaoMarker };
