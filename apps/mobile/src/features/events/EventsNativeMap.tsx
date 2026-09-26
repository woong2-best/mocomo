import { useMemo, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Feature } from "geojson";
import type { MapEventPin } from "@/api/events";
import { eventPinColor } from "@/features/events/event-map-colors";
import {
  ESRI_SATELLITE_STYLE,
  SUBCULTURE_MAP_GLOBAL_VIEW,
} from "@/maps/map-styles";
import { globeCenterForCountry } from "@/navigation/DrawerMapLibreGlobe";

type ViewConfig = { lat: number; lng: number; zoom: number };

function validPins(pins: MapEventPin[]) {
  return pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

export function viewForEventPins(
  pins: MapEventPin[],
  global: boolean,
  userCountryCode?: string | null
): ViewConfig {
  if (global) {
    if (userCountryCode) {
      const center = globeCenterForCountry(userCountryCode);
      return { lat: center.lat, lng: center.lng, zoom: 3.4 };
    }
    return SUBCULTURE_MAP_GLOBAL_VIEW;
  }
  const usable = validPins(pins);
  if (usable.length === 0) {
    return { lat: 37.5665, lng: 126.978, zoom: 11 };
  }
  const lat = usable.reduce((s, p) => s + p.lat, 0) / usable.length;
  const lng = usable.reduce((s, p) => s + p.lng, 0) / usable.length;
  if (usable.length === 1) {
    return { lat, lng, zoom: 11 };
  }
  const lngs = usable.map((p) => p.lng);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const zoom =
    lngSpan > 40 ? 4 : lngSpan > 20 ? 5 : lngSpan > 8 ? 6 : lngSpan > 4 ? 7 : 8;
  return { lat, lng, zoom };
}

/** Satellite street-level focus — matches web `PIN_FOCUS_ZOOM` */
const PIN_FOCUS_ZOOM = 16;

type Props = {
  pins: MapEventPin[];
  global?: boolean;
  /** With `global` pins: first camera frame centers on the user’s country (e.g. KR → Korea). */
  userCountryCode?: string | null;
  selectedId: string | null;
  onSelectPin: (pin: MapEventPin) => void;
  /** Focus camera on this pin when set */
  focusPinId?: string | null;
  /** Drawer preview — no pan/zoom/pin taps */
  preview?: boolean;
  style?: object;
};

function MapFallback({ style }: { style?: object }) {
  return (
    <View style={[styles.fallback, style]}>
      <Ionicons name="map-outline" size={36} color="#A78BFA" />
    </View>
  );
}

/**
 * Subculture Map — Esri World Imagery via MapLibre (same tiles as web).
 * Used-trade meet maps use `MeetMap` (MapLibre satellite).
 */
export function EventsNativeMap({
  pins,
  global = true,
  userCountryCode,
  selectedId,
  onSelectPin,
  focusPinId,
  preview = false,
  style,
}: Props) {
  const usablePins = useMemo(() => validPins(pins), [pins]);
  const baseView = useMemo(
    () => viewForEventPins(usablePins, global, userCountryCode),
    [usablePins, global, userCountryCode]
  );

  const focused = useMemo(() => {
    if (!focusPinId) return null;
    return usablePins.find((p) => p.id === focusPinId) ?? null;
  }, [focusPinId, usablePins]);

  const view: ViewConfig = focused
    ? { lat: focused.lat, lng: focused.lng, zoom: PIN_FOCUS_ZOOM }
    : baseView;

  const MLRN = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@maplibre/maplibre-react-native") as {
        Map: ComponentType<Record<string, unknown>>;
        Camera: ComponentType<Record<string, unknown>>;
        GeoJSONSource: ComponentType<Record<string, unknown>>;
        Layer: ComponentType<Record<string, unknown>>;
      };
    } catch {
      return null;
    }
  }, []);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: usablePins.map((pin) => ({
        type: "Feature" as const,
        id: pin.id,
        geometry: { type: "Point" as const, coordinates: [pin.lng, pin.lat] },
        properties: {
          id: pin.id,
          color: eventPinColor(pin.category),
          selected: selectedId === pin.id ? 1 : 0,
        },
      })),
    }),
    [usablePins, selectedId]
  );

  if (usablePins.length === 0 || !MLRN?.Map) {
    return <MapFallback style={style} />;
  }

  const { Map, Camera, GeoJSONSource, Layer } = MLRN;

  return (
    <View style={[styles.wrap, style]}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={ESRI_SATELLITE_STYLE}
        compass={false}
        attribution={false}
        logo={false}
        scrollEnabled={!preview}
        zoomEnabled={!preview}
        rotateEnabled={!preview}
        pitchEnabled={!preview}
        doubleTouchZoomEnabled={!preview}
      >
        <Camera
          center={[view.lng, view.lat]}
          zoom={view.zoom}
          duration={focused ? 700 : 350}
          easing="fly"
        />
        <GeoJSONSource
          id="event-pins"
          data={geojson}
          onPress={
            preview
              ? undefined
              : (event: { nativeEvent?: { features?: Feature[] } }) => {
                  const feature = event.nativeEvent?.features?.[0];
                  const id = feature?.properties?.id;
                  if (typeof id !== "string") return;
                  const pin = usablePins.find((p) => p.id === id);
                  if (pin) onSelectPin(pin);
                }
          }
        >
          <Layer
            id="event-pins-halo"
            type="circle"
            paint={{
              "circle-radius": ["case", ["==", ["get", "selected"], 1], 16, 12],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.28,
            }}
          />
          <Layer
            id="event-pins-circle"
            type="circle"
            paint={{
              "circle-radius": ["case", ["==", ["get", "selected"], 1], 9, 7],
              "circle-color": ["get", "color"],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </GeoJSONSource>
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: "hidden", backgroundColor: "#0B1020" },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B1020",
  },
});
