import { useMemo, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MapProviderProps } from "@/maps/types";

/** OSM-based vector style (OpenFreeMap liberty). */
const OSM_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * MapLibre Native + OSM-compatible style (non-KR).
 * Requires @maplibre/maplibre-react-native + EAS/dev-client rebuild.
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
        MapView: ComponentType<Record<string, unknown>>;
        Camera: ComponentType<Record<string, unknown>>;
        PointAnnotation: ComponentType<Record<string, unknown>>;
      };
    } catch {
      return null;
    }
  }, []);

  if (!MLRN) {
    return (
      <View style={[styles.fallback, style]}>
        <Ionicons name="map-outline" size={36} color="#1B4A8C" />
      </View>
    );
  }

  const { MapView, Camera, PointAnnotation } = MLRN;
  const pin = marker;

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        style={StyleSheet.absoluteFill}
        mapStyle={OSM_STYLE_URL}
        compassEnabled
        attributionEnabled
        onPress={(e: { geometry?: { coordinates?: number[] } }) => {
          if (mode !== "pick" || !onPick) return;
          const coords = e?.geometry?.coordinates;
          if (!coords || coords.length < 2) return;
          onPick({ lng: coords[0]!, lat: coords[1]! });
        }}
      >
        <Camera
          centerCoordinate={[center.lng, center.lat]}
          zoomLevel={zoom}
          animationMode="flyTo"
          animationDuration={400}
        />
        {pin ? (
          <PointAnnotation id="meet-pin" coordinate={[pin.lng, pin.lat]}>
            <View style={styles.pin}>
              <Ionicons name="location" size={28} color="#EF4444" />
            </View>
          </PointAnnotation>
        ) : null}
      </MapView>
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
