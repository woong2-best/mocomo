import { useMemo, useState, type ComponentType } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Feature } from "geojson";
import type { MapEventPin } from "@/api/events";
import { eventPinColor } from "@/features/events/event-map-colors";

const OSM_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const GLOBAL_VIEW = { lat: 28, lng: 135, zoom: 3 };

type ViewConfig = { lat: number; lng: number; zoom: number };

function validPins(pins: MapEventPin[]) {
  return pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

export function viewForEventPins(pins: MapEventPin[], global: boolean): ViewConfig {
  if (global) return GLOBAL_VIEW;
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

function nearestPin(lat: number, lng: number, pins: MapEventPin[], maxDeg = 0.025) {
  let best: MapEventPin | null = null;
  let bestD = maxDeg * maxDeg;
  for (const pin of pins) {
    const d = (pin.lat - lat) ** 2 + (pin.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = pin;
    }
  }
  return best;
}

type Props = {
  pins: MapEventPin[];
  global: boolean;
  selectedId: string | null;
  onSelectPin: (pin: MapEventPin) => void;
  style?: object;
};

function MapFallback({ style }: { style?: object }) {
  return (
    <View style={[styles.fallback, style]}>
      <Ionicons name="map-outline" size={36} color="#1B4A8C" />
    </View>
  );
}

function EventsKakaoMap({
  pins,
  view,
  onSelectPin,
  style,
}: {
  pins: MapEventPin[];
  view: ViewConfig;
  onSelectPin: (pin: MapEventPin) => void;
  style?: object;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const KakaoMapView = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@jiggag/react-native-kakao-maps").KakaoMapView as ComponentType<{
        width: number;
        height: number;
        centerPoint?: { lat: number; lng: number };
        markerList: { lat: number; lng: number; markerName: string }[];
        onChange: (event: { nativeEvent: { lat: number; lng: number; zoomLevel: number } }) => void;
      }>;
    } catch {
      return null;
    }
  }, []);

  const markers = useMemo(
    () => pins.map((p) => ({ lat: p.lat, lng: p.lng, markerName: p.title.slice(0, 24) })),
    [pins]
  );

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ width, height });
  }

  if (!KakaoMapView) {
    return <MapFallback style={style} />;
  }

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {size.width > 0 && size.height > 0 ? (
        <KakaoMapView
          width={Math.round(size.width)}
          height={Math.round(size.height)}
          centerPoint={{ lat: view.lat, lng: view.lng }}
          markerList={markers}
          onChange={(event) => {
            const { lat, lng } = event.nativeEvent;
            const hit = nearestPin(lat, lng, pins);
            if (hit) onSelectPin(hit);
          }}
        />
      ) : null}
    </View>
  );
}

function EventsMapLibreMap({
  pins,
  view,
  selectedId,
  onSelectPin,
  style,
}: {
  pins: MapEventPin[];
  view: ViewConfig;
  selectedId: string | null;
  onSelectPin: (pin: MapEventPin) => void;
  style?: object;
}) {
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
      features: pins.map((pin) => ({
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
    [pins, selectedId]
  );

  if (!MLRN?.Map) {
    return <MapFallback style={style} />;
  }

  const { Map, Camera, GeoJSONSource, Layer } = MLRN;

  return (
    <View style={[styles.wrap, style]}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={OSM_STYLE_URL}
        compass
        attribution
      >
        <Camera
          center={[view.lng, view.lat]}
          zoom={view.zoom}
          duration={350}
          easing="fly"
        />
        <GeoJSONSource
          id="event-pins"
          data={geojson}
          onPress={(event: { nativeEvent?: { features?: Feature[] } }) => {
            const feature = event.nativeEvent?.features?.[0];
            const id = feature?.properties?.id;
            if (typeof id !== "string") return;
            const pin = pins.find((p) => p.id === id);
            if (pin) onSelectPin(pin);
          }}
        >
          <Layer
            id="event-pins-circle"
            type="circle"
            paint={{
              "circle-radius": ["case", ["==", ["get", "selected"], 1], 10, 8],
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

/**
 * KR/local → Kakao Native · global → MapLibre v11 (GeoJSON circles).
 * Avoids removed MapView/PointAnnotation APIs that crash on Android.
 */
export function EventsNativeMap({ pins, global, selectedId, onSelectPin, style }: Props) {
  const usablePins = useMemo(() => validPins(pins), [pins]);
  const view = useMemo(() => viewForEventPins(usablePins, global), [usablePins, global]);

  if (usablePins.length === 0) {
    return <MapFallback style={style} />;
  }

  if (!global) {
    return (
      <EventsKakaoMap pins={usablePins} view={view} onSelectPin={onSelectPin} style={style} />
    );
  }

  return (
    <EventsMapLibreMap
      pins={usablePins}
      view={view}
      selectedId={selectedId}
      onSelectPin={onSelectPin}
      style={style}
    />
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
