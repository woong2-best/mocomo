import { useMemo, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MapProviderProps } from "@/maps/types";

/** OSM-based vector style (OpenFreeMap liberty). */
const OSM_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * MapLibre Native + OSM-compatible style (non-KR).
 * Uses MapLibre v11 Map/Marker/Camera API.
 */
export function MapLibreMapProvider({
  mode,
  center,
  zoom,
  marker,
  onPick,
  style,
}: MapProviderProps) {
  const MLRN = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@maplibre/maplibre-react-native") as {
        Map: ComponentType<Record<string, unknown>>;
        Camera: ComponentType<Record<string, unknown>>;
        Marker: ComponentType<Record<string, unknown>>;
      };
    } catch {
      return null;
    }
  }, []);

  if (!MLRN?.Map) {
    return (
      <View style={[styles.fallback, style]}>
        <Ionicons name="map-outline" size={36} color="#1B4A8C" />
      </View>
    );
  }

  const { Map, Camera, Marker } = MLRN;
  const pin = marker;

  return (
    <View style={[styles.wrap, style]}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={OSM_STYLE_URL}
        compass
        attribution
        onPress={(e: { nativeEvent?: { lngLat?: [number, number] } }) => {
          if (mode !== "pick" || !onPick) return;
          const lngLat = e.nativeEvent?.lngLat;
          if (!lngLat || lngLat.length < 2) return;
          onPick({ lng: lngLat[0]!, lat: lngLat[1]! });
        }}
      >
        <Camera center={[center.lng, center.lat]} zoom={zoom} duration={400} easing="fly" />
        {pin ? (
          <Marker lngLat={[pin.lng, pin.lat]}>
            <View style={styles.pin}>
              <Ionicons name="location" size={28} color="#EF4444" />
            </View>
          </Marker>
        ) : null}
      </Map>
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
  pin: { alignItems: "center", justifyContent: "center" },
});
