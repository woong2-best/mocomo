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
    if (err.message === "UNSUPPORTED") return "Location isn't available on this device.";
    if (err.message === "PERMISSION_DENIED") return "Allow location permission.";
  }
  const code = (err as GeolocationPositionError | undefined)?.code;
  if (code === 1) return "Allow location permission.";
  if (code === 2) return "Couldn't get location. Check GPS and network.";
  if (code === 3) return "Location request timed out. Try again.";
  return "Couldn't get current location.";
}
