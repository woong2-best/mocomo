import { useMemo, useState, type ComponentType } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MapProviderProps } from "@/maps/types";

/**
 * Kakao Maps Native SDK provider (KR).
 * Uses @jiggag/react-native-kakao-maps — requires EAS/dev-client rebuild + KAKAO_APP_KEY.
 */
export function KakaoMapProvider({
  mode,
  center,
  marker,
  onPick,
  style,
}: MapProviderProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const KakaoMapView = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@jiggag/react-native-kakao-maps").KakaoMapView as ComponentType<{
        width: number;
        height: number;
        centerPoint: { lat: number; lng: number };
        markerList: { lat: number; lng: number; markerName: string }[];
        onChange?: (event: {
          nativeEvent: { lat: number; lng: number; zoomLevel: number };
        }) => void;
      }>;
    } catch {
      return null;
    }
  }, []);

  const pin = marker ?? null;
  const markers = pin
    ? [{ lat: pin.lat, lng: pin.lng, markerName: "meet" }]
    : [];

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ width, height });
  }

  if (!KakaoMapView) {
    return (
      <View style={[styles.fallback, style]} onLayout={onLayout}>
        <Ionicons name="map-outline" size={36} color="#1B4A8C" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {size.width > 0 && size.height > 0 ? (
        <KakaoMapView
          width={Math.round(size.width)}
          height={Math.round(size.height)}
          centerPoint={{ lat: center.lat, lng: center.lng }}
          markerList={markers}
          onChange={(event) => {
            if (mode !== "pick" || !onPick) return;
            const { lat, lng } = event.nativeEvent;
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              onPick({ lat, lng });
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: "hidden" },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27,74,140,0.08)",
  },
});
