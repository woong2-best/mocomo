export type GeoCoords = { lat: number; lng: number };

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

function browserPosition(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("UNSUPPORTED"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 }
    );
  });
}

async function capacitorPosition(): Promise<GeoCoords> {
  const { Geolocation } = await import("@capacitor/geolocation");
  const current = await Geolocation.checkPermissions();
  if (current.location !== "granted") {
    const requested = await Geolocation.requestPermissions();
    if (requested.location !== "granted") {
      throw new Error("PERMISSION_DENIED");
    }
  }
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 15_000,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export async function getCurrentCoords(): Promise<GeoCoords> {
  if (isCapacitorNative()) {
    return capacitorPosition();
  }
  return browserPosition();
}

export function geolocationErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "UNSUPPORTED") return "이 기기에서는 위치를 사용할 수 없습니다.";
    if (err.message === "PERMISSION_DENIED") return "위치 권한을 허용해 주세요.";
  }
  const code = (err as GeolocationPositionError | undefined)?.code;
  if (code === 1) return "위치 권한을 허용해 주세요.";
  if (code === 2) return "위치를 가져올 수 없습니다. GPS·네트워크를 확인해 주세요.";
  if (code === 3) return "위치 요청 시간이 초과되었습니다. 다시 시도해 주세요.";
  return "현재 위치를 가져오지 못했습니다.";
}
