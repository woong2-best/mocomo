import { useEffect, useMemo, useState, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Feature } from "geojson";
import type { MapEventPin } from "@/api/events";
import { eventPinColor } from "@/features/events/event-map-colors";
import {
  ESRI_SATELLITE_MAX_ZOOM,
  ESRI_SATELLITE_STYLE,
  MAPLIBRE_LABEL_FONTS,
  SUBCULTURE_MAP_GLOBAL_VIEW,
} from "@/maps/map-styles";
import { globeCenterForCountry } from "@/navigation/DrawerMapLibreGlobe";

type ViewConfig = { lat: number; lng: number; zoom: number };

/** Screen-pixel pad around a tap. The pin graphic stays small. */
const PIN_HITBOX = { top: 20, right: 20, bottom: 20, left: 20 };

function validPins(pins: MapEventPin[]) {
  return pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function pressFeatures(event: unknown): Feature[] {
  const root = event as {
    features?: Feature[];
    nativeEvent?: { features?: Feature[]; payload?: { features?: Feature[] } };
  };
  return (
    root.nativeEvent?.features ??
    root.nativeEvent?.payload?.features ??
    root.features ??
    []
  );
}

function isClusterFeature(feature: Feature) {
  const props = feature.properties ?? {};
  if (props.cluster === true) return true;
  const count = Number(props.point_count);
  return Number.isFinite(count) && count > 1;
}

function clusterCenterFromPress(event: unknown): { lat: number; lng: number } | null {
  for (const feature of pressFeatures(event)) {
    if (!isClusterFeature(feature) || feature.geometry?.type !== "Point") continue;
    const [lng, lat] = feature.geometry.coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function pinFromPressEvent(event: unknown, pins: MapEventPin[]): MapEventPin | null {
  const features = pressFeatures(event);
  const tap = coordsFromPressEvent(event);
  let best: MapEventPin | null = null;
  let bestDist = Infinity;
  for (const feature of features) {
    if (isClusterFeature(feature)) continue;
    const raw = feature.properties?.id ?? feature.id;
    const id = raw == null ? "" : String(raw);
    if (!id) continue;
    const pin = pins.find((p) => p.id === id);
    if (!pin) continue;
    if (!tap) return pin;
    const dist = Math.hypot(pin.lat - tap.lat, pin.lng - tap.lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = pin;
    }
  }
  return best;
}

/** If MapLibre misses the circle layer, still accept a tap near the pin. */
function nearestPinAtCoords(
  coords: { lat: number; lng: number } | null,
  pins: MapEventPin[],
  zoom: number
): MapEventPin | null {
  if (!coords || pins.length === 0) return null;
  const maxDeg = (360 / (256 * 2 ** Math.max(zoom, 1))) * 20;
  const cos = Math.cos((coords.lat * Math.PI) / 180);
  let best: MapEventPin | null = null;
  let bestDist = Infinity;
  for (const pin of pins) {
    const dist = Math.hypot(pin.lat - coords.lat, (pin.lng - coords.lng) * cos);
    if (dist < bestDist) {
      bestDist = dist;
      best = pin;
    }
  }
  return best && bestDist <= maxDeg ? best : null;
}

function coordsFromPressEvent(event: unknown): { lat: number; lng: number } | null {
  const root = event as {
    coordinates?: unknown;
    nativeEvent?: {
      lngLat?: [number, number];
      coordinates?: unknown;
      payload?: { lngLat?: [number, number]; coordinates?: unknown };
    };
  };
  const native = root.nativeEvent;
  const payload = native?.payload;
  const candidates = [native?.lngLat, payload?.lngLat, native?.coordinates, payload?.coordinates, root.coordinates];
  for (const coords of candidates) {
    if (Array.isArray(coords) && coords.length >= 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      return { lng: coords[0]!, lat: coords[1]! };
    }
    if (coords && typeof coords === "object") {
      const c = coords as { longitude?: number; latitude?: number; lng?: number; lat?: number };
      const lng = c.longitude ?? c.lng;
      const lat = c.latitude ?? c.lat;
      if (Number.isFinite(lng) && Number.isFinite(lat)) return { lng: lng as number, lat: lat as number };
    }
  }
  return null;
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
  /** Recommended-place registration — tap the map to pick coordinates. */
  pickMode?: boolean;
  onMapPick?: (coords: { lat: number; lng: number }) => void;
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
  pickMode = false,
  onMapPick,
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

  const [explore, setExplore] = useState<ViewConfig | null>(null);
  useEffect(() => {
    setExplore(null);
  }, [usablePins, focusPinId]);

  const view: ViewConfig = focused
    ? { lat: focused.lat, lng: focused.lng, zoom: PIN_FOCUS_ZOOM }
    : explore ?? baseView;

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

  if (!MLRN?.Map) {
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
        onPress={
          preview
            ? undefined
            : (event: unknown) => {
                const cluster = clusterCenterFromPress(event);
                if (cluster) {
                  setExplore({
                    lat: cluster.lat,
                    lng: cluster.lng,
                    zoom: Math.min(ESRI_SATELLITE_MAX_ZOOM, Math.max(view.zoom + 1.8, 5)),
                  });
                  return;
                }
                const coords = coordsFromPressEvent(event);
                const pin =
                  pinFromPressEvent(event, usablePins) ??
                  (view.zoom >= 14
                    ? nearestPinAtCoords(coords, usablePins, view.zoom)
                    : null);
                if (pin) {
                  onSelectPin(pin);
                  return;
                }
                if (!pickMode || !onMapPick || !coords) return;
                onMapPick(coords);
              }
        }
      >
        <Camera
          center={[view.lng, view.lat]}
          zoom={Math.min(view.zoom, ESRI_SATELLITE_MAX_ZOOM)}
          maxZoom={ESRI_SATELLITE_MAX_ZOOM}
          duration={focused ? 700 : 350}
          easing="fly"
        />
        <GeoJSONSource
          id="event-pins"
          data={geojson}
          cluster
          clusterRadius={50}
          clusterMaxZoomLevel={16}
          hitbox={PIN_HITBOX}
          onPress={
            preview
              ? undefined
              : (event: { stopPropagation?: () => void }) => {
                  const cluster = clusterCenterFromPress(event);
                  if (cluster) {
                    event.stopPropagation?.();
                    setExplore({
                      lat: cluster.lat,
                      lng: cluster.lng,
                      zoom: Math.min(ESRI_SATELLITE_MAX_ZOOM, Math.max(view.zoom + 1.8, 5)),
                    });
                    return;
                  }
                  const pin =
                    pinFromPressEvent(event, usablePins) ??
                    (view.zoom >= 14
                      ? nearestPinAtCoords(coordsFromPressEvent(event), usablePins, view.zoom)
                      : null);
                  if (!pin) return;
                  event.stopPropagation?.();
                  onSelectPin(pin);
                }
          }
        >
          <Layer
            id="event-clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": "#7c3aed",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-radius": [
                "min",
                ["step", ["get", "point_count"], 12, 10, 14, 50, 16],
                ["interpolate", ["linear"], ["zoom"], 1, 8, 3, 12, 6, 16],
              ],
              "circle-pitch-alignment": "viewport",
              "circle-pitch-scale": "viewport",
            }}
          />
          <Layer
            id="event-cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 11,
              "text-font": [...MAPLIBRE_LABEL_FONTS],
              "text-anchor": "center",
              "text-justify": "center",
              "text-offset": [0, 0],
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            }}
            paint={{
              "text-color": "#ffffff",
            }}
          />
          <Layer
            id="event-pins-circle"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-radius": ["case", ["==", ["get", "selected"], 1], 8, 7],
              "circle-color": ["get", "color"],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-pitch-alignment": "viewport",
              "circle-pitch-scale": "viewport",
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
