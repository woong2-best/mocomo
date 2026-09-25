import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Haptics from "expo-haptics";

const MAPLIBRE_VERSION = "6.1.0";

const MAPLIBRE_SOURCES = [
  `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`,
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`,
];

export type UsedMapPin = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  title: string;
  place: string;
  when?: string;
  price?: string;
};

type Props = {
  backgroundColor: string;
  width: number;
  height: number;
  center: { lat: number; lng: number };
  zoom: number;
  pins: UsedMapPin[];
  onPick?: (coords: { lat: number; lng: number }) => void;
};

function safeColor(color: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#0F1524";
}

function mapHtml(
  backgroundColor: string,
  lat: number,
  lng: number,
  zoom: number,
  pick: boolean
) {
  const bg = safeColor(backgroundColor);
  const sources = JSON.stringify(MAPLIBRE_SOURCES);
  const safeLat = Number.isFinite(lat) ? lat : 37.5665;
  const safeLng = Number.isFinite(lng) ? lng : 126.978;
  const safeZoom = Number.isFinite(zoom) ? zoom : 14;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${bg}; overflow: hidden; }
  .maplibregl-map { position: absolute; inset: 0; background: ${bg}; }
  .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { display: none !important; }
  .pin {
    width: 16px; height: 16px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,.5);
  }
  .maplibregl-popup-content { border-radius: 12px; padding: 8px 10px; font: 12px/1.35 -apple-system, sans-serif; color: #141820; max-width: 220px; }
  .maplibregl-popup-close-button { font-size: 16px; padding: 2px 6px; }
  .popup-title { display: block; font-weight: 800; }
  .popup-meta { display: block; margin-top: 3px; color: #3f3f46; }
</style>
</head>
<body>
<div id="map"></div>
<script type="module">
const post = (msg) => {
  try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
};
const sources = ${sources};
let maplibregl = null;
let loadedFrom = "";
for (const url of sources) {
  try {
    maplibregl = await import(url);
    loadedFrom = url;
    break;
  } catch (err) {}
}
if (!maplibregl) {
  post({ type: "error" });
} else {
  maplibregl.setWorkerUrl(loadedFrom.replace(/maplibre-gl\\.mjs$/, "maplibre-gl-worker.mjs"));
  const style = {
    version: 8,
    sources: {
      "satellite-tiles": {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "Tiles © Esri"
      }
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "${bg}" } },
      { id: "satellite-layer", type: "raster", source: "satellite-tiles", minzoom: 0, maxzoom: 22 }
    ]
  };
  const map = new maplibregl.Map({
    container: "map",
    style,
    center: [${safeLng}, ${safeLat}],
    zoom: ${safeZoom},
    minZoom: 3,
    maxZoom: 18,
    pitch: 0,
    bearing: 0,
    attributionControl: false,
    fadeDuration: 0,
    maxPitch: 0,
    renderWorldCopies: true
  });
  map.dragRotate.disable();
  map.touchPitch.disable();
  map.keyboard.disable();
  const markers = new Map();
  let popup = null;
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const showPin = (pin) => {
    const lines = [pin.place, pin.when, pin.price].filter(Boolean).map((line) => '<span class="popup-meta">' + esc(line) + "</span>").join("");
    const html = '<strong class="popup-title">' + esc(pin.title || "거래 장소") + "</strong>" + lines;
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "230px", offset: 16 })
      .setLngLat([pin.lng, pin.lat])
      .setHTML(html)
      .addTo(map);
    post({ type: "pin" });
  };
  window.__setPins = (pins) => {
    const next = new Set();
    for (const pin of pins || []) {
      next.add(pin.id);
      const prev = markers.get(pin.id);
      if (prev) prev.remove();
      const el = document.createElement("div");
      el.className = "pin";
      el.style.background = pin.color || "#1B4A8C";
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        showPin(pin);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      markers.set(pin.id, marker);
    }
    for (const [id, marker] of markers) {
      if (!next.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    }
  };
  window.__focus = (lng, lat, z) => {
    try { map.jumpTo({ center: [lng, lat], zoom: z, pitch: 0, bearing: 0 }); } catch (e) {}
  };
  ${
    pick
      ? `map.on("click", (event) => {
    post({ type: "pick", lat: event.lngLat.lat, lng: event.lngLat.lng });
  });`
      : ""
  }
  map.on("load", () => {
    post({ type: "ready" });
    if (window.__pendingPins) window.__setPins(window.__pendingPins);
  });
  new ResizeObserver(() => { try { map.resize(); } catch (e) {} }).observe(document.getElementById("map"));
}
</script>
</body>
</html>`;
}

export function UsedSatelliteMap({
  backgroundColor,
  width,
  height,
  center,
  zoom,
  pins,
  onPick,
}: Props) {
  const webRef = useRef<WebView>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pick = !!onPick;
  const html = useMemo(
    () => mapHtml(backgroundColor, center.lat, center.lng, zoom, pick),
    [backgroundColor, center.lat, center.lng, zoom, pick]
  );
  const payload = useMemo(
    () =>
      pins
        .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))
        .slice(0, 80),
    [pins]
  );
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const pushPins = (list: UsedMapPin[]) => {
    webRef.current?.injectJavaScript(
      `window.__pendingPins=${JSON.stringify(list)};window.__setPins&&window.__setPins(window.__pendingPins);true;`
    );
  };

  useEffect(() => {
    pushPins(payload);
  }, [payload]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        lat?: number;
        lng?: number;
      };
      if (data.type === "ready") {
        pushPins(payloadRef.current);
        webRef.current?.injectJavaScript(
          `window.__focus&&window.__focus(${center.lng},${center.lat},${zoom});true;`
        );
      } else if (data.type === "pick" && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        onPickRef.current?.({ lat: data.lat!, lng: data.lng! });
      } else if (data.type === "pin") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      /* ignore malformed bridge messages */
    }
  };

  if (width < 2 || height < 2) return <View style={{ width, height, backgroundColor }} />;

  return (
    <View style={[styles.fill, { width, height, backgroundColor }]} collapsable={false}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: "https://cdn.jsdelivr.net/" }}
        style={{ width, height, backgroundColor }}
        containerStyle={{ backgroundColor }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        androidLayerType="hardware"
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        textZoom={100}
        onMessage={onMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { overflow: "hidden" },
});
