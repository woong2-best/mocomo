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

export function meetLocationErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === "PERMISSION_DENIED") {
    return "위치 권한을 허용해 주세요.";
  }
  return "현재 위치를 가져오지 못했습니다.";
}
