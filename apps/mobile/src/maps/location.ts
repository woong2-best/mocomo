import * as Location from "expo-location";
import type { MeetCoords } from "@/maps/types";

export async function getCurrentMeetCoords(): Promise<MeetCoords> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) {
    throw new Error("PERMISSION_DENIED");
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  };
}

/** 도착 인증 버튼을 눌렀을 때만 전경 위치를 한 번 읽는다. 백그라운드 추적은 쓰지 않는다. */
export async function getArrivalFix(): Promise<
  | { ok: true; latitude: number; longitude: number; accuracyMeters: number | null }
  | { ok: false; failure: "PERMISSION_DENIED" | "GPS_FAILED" }
> {
  let perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) return { ok: false, failure: "PERMISSION_DENIED" };
    perm = await Location.requestForegroundPermissionsAsync();
  }
  if (!perm.granted) return { ok: false, failure: "PERMISSION_DENIED" };
  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("GPS_TIMEOUT")), 12_000);
      }),
    ]);
    const accuracy = pos.coords.accuracy;
    return {
      ok: true,
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracyMeters: typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null,
    };
  } catch {
    return { ok: false, failure: "GPS_FAILED" };
  }
}

export function meetLocationErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === "PERMISSION_DENIED") {
    return "위치 권한을 허용해 주세요.";
  }
  return "현재 위치를 가져오지 못했습니다.";
}
