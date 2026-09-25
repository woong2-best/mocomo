import { useEffect, useMemo, useRef } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Haptics from "expo-haptics";
import type { MapEventPin } from "@/api/events";
import { eventPinColor } from "@/features/events/event-map-colors";

const MAPLIBRE_VERSION = "6.1.0";

/**
 * maplibre-gl 6.1 ships ESM only (`maplibre-gl.mjs` + `maplibre-gl-worker.mjs`).
 * The old `maplibre-gl.js` URL 404s, the worker never starts, and the drawer stays empty.
 * The worker URL is derived from `import.meta.url` and is blank unless that URL is http(s).
 */
const MAPLIBRE_SOURCES = [
  `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`,
  `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`,
];

/** Country centers shared with the web subculture map. Camera aims here, not a fixed coast. */
const COUNTRY_GLOBE_CENTER: Record<string, { lat: number; lng: number }> = {
  kr: { lat: 36.5, lng: 127.8 },
  jp: { lat: 36.2, lng: 138.2 },
  us: { lat: 39.8, lng: -98.5 },
  cn: { lat: 35.0, lng: 105.0 },
  tw: { lat: 23.7, lng: 121.0 },
  th: { lat: 13.7, lng: 100.5 },
  vn: { lat: 16.0, lng: 108.0 },
  ph: { lat: 12.8, lng: 122.0 },
  id: { lat: -2.5, lng: 118.0 },
  sg: { lat: 1.35, lng: 103.8 },
  my: { lat: 4.2, lng: 101.7 },
  hk: { lat: 22.3, lng: 114.2 },
  mo: { lat: 22.2, lng: 113.5 },
  gb: { lat: 54.0, lng: -2.5 },
  fr: { lat: 46.6, lng: 2.2 },
  de: { lat: 51.2, lng: 10.4 },
  es: { lat: 40.4, lng: -3.7 },
  it: { lat: 42.5, lng: 12.5 },
  ru: { lat: 55.8, lng: 37.6 },
  ca: { lat: 56.0, lng: -96.0 },
  br: { lat: -14.2, lng: -51.9 },
  mx: { lat: 23.6, lng: -102.5 },
  ar: { lat: -34.6, lng: -58.4 },
  cl: { lat: -33.4, lng: -70.6 },
  co: { lat: 4.7, lng: -74.0 },
  pe: { lat: -12.0, lng: -77.0 },
  au: { lat: -25.3, lng: 133.8 },
  nz: { lat: -41.3, lng: 174.8 },
  fi: { lat: 61.9, lng: 25.7 },
  se: { lat: 59.3, lng: 18.1 },
  no: { lat: 59.9, lng: 10.7 },
  dk: { lat: 55.7, lng: 12.6 },
  pl: { lat: 52.2, lng: 21.0 },
  ro: { lat: 44.4, lng: 26.1 },
  hu: { lat: 47.5, lng: 19.0 },
  cz: { lat: 50.1, lng: 14.4 },
  at: { lat: 48.2, lng: 16.4 },
  ch: { lat: 47.0, lng: 8.5 },
  nl: { lat: 52.1, lng: 5.3 },
  be: { lat: 50.8, lng: 4.4 },
  pt: { lat: 38.7, lng: -9.1 },
  gr: { lat: 37.98, lng: 23.7 },
  ua: { lat: 50.4, lng: 30.5 },
  tr: { lat: 41.0, lng: 29.0 },
  sa: { lat: 24.7, lng: 46.7 },
  ae: { lat: 25.2, lng: 55.3 },
  il: { lat: 32.1, lng: 34.8 },
  za: { lat: -26.2, lng: 28.0 },
  la: { lat: 17.97, lng: 102.6 },
  kh: { lat: 11.56, lng: 104.9 },
  mm: { lat: 16.8, lng: 96.2 },
  bn: { lat: 4.9, lng: 114.9 },
};

/**
 * Pitched just enough that the globe's crown is the curved limb.
 * Top padding drops that limb onto the top edge of the map, under the menu.
 * minZoom locks this view so pinch cannot shrink the earth.
 */
const GLOBE_ZOOM = 4.12;
const GLOBE_PITCH = 40;
const PIN_FOCUS_ZOOM = 16;

export function globeCenterForCountry(countryCode?: string | null) {
  const key = (countryCode ?? "").trim().toLowerCase();
  return COUNTRY_GLOBE_CENTER[key] ?? { lat: 20, lng: 0 };
}

type Props = {
  pins: MapEventPin[];
  backgroundColor: string;
  width: number;
  height: number;
  center: { lat: number; lng: number };
  onOpen: () => void;
  onOpenPressIn?: () => void;
};

function safeColor(color: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#0F1524";
}

function globePins(pins: MapEventPin[]) {
  return pins
    .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))
    .slice(0, 80)
    .map((pin) => ({
      id: pin.id,
      lat: pin.lat,
      lng: pin.lng,
      color: eventPinColor(pin.category),
      title: pin.title,
      venue: pin.venueName,
      category: pin.category,
      phase: pin.phase ?? "",
      country: pin.country,
      startsAt: pin.startsAt,
    }));
}

function globeHtml(backgroundColor: string, lat: number, lng: number) {
  const bg = safeColor(backgroundColor);
  const sources = JSON.stringify(MAPLIBRE_SOURCES);
  const safeLat = Number.isFinite(lat) ? lat : 20;
  const safeLng = Number.isFinite(lng) ? lng : 0;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${bg}; overflow: hidden; }
  .maplibregl-map { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: ${bg}; }
  .maplibregl-canvas-container { width: 100%; height: 100%; }
  .maplibregl-canvas { position: absolute; left: 0; top: 0; }
  .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo, .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { display: none !important; }
  .pin { width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.45); }
  .maplibregl-popup-content { border-radius: 12px; padding: 8px 10px; font: 12px/1.35 -apple-system, sans-serif; color: #141820; }
  .maplibregl-popup-close-button { font-size: 16px; padding: 2px 6px; }
  .popup-badge { display: inline-block; margin-bottom: 4px; padding: 1px 6px; border-radius: 999px; background: #ede9fe; color: #5b21b6; font-size: 10px; font-weight: 700; }
  .popup-title { display: block; font-weight: 800; }
  .popup-meta { display: block; margin-top: 2px; color: #3f3f46; }
  .popup-links { display: flex; gap: 10px; margin-top: 6px; }
  .popup-links a { color: #1d4ed8; font-weight: 700; text-decoration: none; }
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
  const workerUrl = loadedFrom.replace(/maplibre-gl\\.mjs$/, "maplibre-gl-worker.mjs");
  maplibregl.setWorkerUrl(workerUrl);
  const style = {
    version: 8,
    projection: { type: "globe" },
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
    zoom: ${GLOBE_ZOOM},
    minZoom: ${GLOBE_ZOOM},
    maxZoom: 17,
    pitch: ${GLOBE_PITCH},
    bearing: 0,
    attributionControl: false,
    fadeDuration: 0,
    maxPitch: 60,
    renderWorldCopies: false,
    canvasContextAttributes: { preserveDrawingBuffer: true, antialias: false, failIfMajorPerformanceCaveat: false }
  });
  map.dragRotate.disable();
  map.touchPitch.disable();
  map.keyboard.disable();
  map.boxZoom.disable();
  map.doubleClickZoom.disable();
  map.touchZoomRotate.disableRotation();
  const markers = new Map();
  let pinTapAt = 0;
  let lastEmptyTap = 0;
  let popup = null;
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const pinDate = (pin) => {
    if (pin.category === "maid_cafe") return "상설";
    if (pin.category === "user_recommendation") return "추천";
    const d = new Date(pin.startsAt);
    if (!pin.startsAt || Number.isNaN(d.getTime())) return "";
    return (d.getMonth() + 1) + "/" + d.getDate();
  };
  const googleSearch = (pin) => {
    const parts = [pin.venue, pin.title];
    if (pin.country && pin.country !== "other") parts.push(pin.country);
    return "https://www.google.com/search?q=" + encodeURIComponent(parts.filter(Boolean).join(" "));
  };
  const placeLink = (pin) => {
    if (String(pin.country || "").toLowerCase() === "kr") {
      return { label: "카카오맵", url: "https://map.kakao.com/link/map/" + pin.lat + "," + pin.lng };
    }
    const q = encodeURIComponent((pin.venue || pin.title || "place") + " " + pin.lat + "," + pin.lng);
    return { label: "Google 지도", url: "https://www.google.com/maps/search/?api=1&query=" + q };
  };
  const showPin = (pin) => {
    const phase = pin.phase === "ongoing" ? "진행 중" : pin.phase === "upcoming" ? "예정" : "";
    const place = placeLink(pin);
    const html = '<div class="popup-card">'
      + (phase ? '<span class="popup-badge">' + esc(phase) + "</span>" : "")
      + '<strong class="popup-title">' + esc(pin.title) + "</strong>"
      + '<span class="popup-meta">' + esc([pinDate(pin), pin.venue].filter(Boolean).join(" · ")) + "</span>"
      + '<div class="popup-links"><a href="#" data-url="' + esc(googleSearch(pin)) + '">Google 검색</a>'
      + '<a href="#" data-url="' + esc(place.url) + '">' + esc(place.label) + "</a></div></div>";
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "230px", offset: 14 })
      .setLngLat([pin.lng, pin.lat])
      .setHTML(html)
      .addTo(map);
    popup.getElement().querySelectorAll("a[data-url]").forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        post({ type: "openUrl", url: anchor.getAttribute("data-url") });
      });
    });
    map.flyTo({
      center: [pin.lng, pin.lat],
      zoom: ${PIN_FOCUS_ZOOM},
      pitch: 0,
      bearing: 0,
      duration: 700,
      essential: true
    });
    post({ type: "pin" });
  };
  const frame = () => {
    try {
      map.setProjection({ type: "globe" });
      map.setSky({
        "sky-color": "${bg}",
        "horizon-color": "${bg}",
        "fog-color": "${bg}",
        "sky-horizon-blend": 0,
        "horizon-fog-blend": 0,
        "atmosphere-blend": 0
      });
    } catch (e) {}
    map.setProjection({ type: "globe" });
    const h = map.getContainer().clientHeight || window.innerHeight || 240;
    const drop = Math.round(h * 0.48);
    map.setMinZoom(${GLOBE_ZOOM});
    map.setMaxZoom(17);
    map.jumpTo({
      center: [${safeLng}, ${safeLat}],
      zoom: ${GLOBE_ZOOM},
      pitch: ${GLOBE_PITCH},
      bearing: 0,
      padding: { top: drop, bottom: 0, left: 0, right: 0 }
    });
    map.setProjection({ type: "globe" });
    map.resize();
  };
  map.on("load", () => {
    frame();
    post({ type: "ready" });
  });
  let lastZoom = ${GLOBE_ZOOM};
  const restoreGlobe = () => {
    const z = map.getZoom();
    const zoomingOut = z < lastZoom - 0.01;
    lastZoom = z;
    if (!zoomingOut || z > ${GLOBE_ZOOM} + 0.35) return;
    map.setProjection({ type: "globe" });
    const h = map.getContainer().clientHeight || window.innerHeight || 240;
    const drop = Math.round(h * 0.48);
    if (Math.abs(map.getPitch() - ${GLOBE_PITCH}) > 1.5) {
      map.easeTo({
        pitch: ${GLOBE_PITCH},
        padding: { top: drop, bottom: 0, left: 0, right: 0 },
        duration: 280,
        essential: true
      });
    }
    map.setProjection({ type: "globe" });
  };
  map.on("zoomend", restoreGlobe);
  map.on("moveend", restoreGlobe);
  map.on("click", () => {
    if (Date.now() - pinTapAt < 400) return;
    const now = Date.now();
    if (now - lastEmptyTap < 320) {
      lastEmptyTap = 0;
      post({ type: "open" });
    } else {
      lastEmptyTap = now;
    }
  });
  window.__setPins = (pins) => {
    const next = new Set();
    for (const pin of pins || []) {
      next.add(pin.id);
      if (markers.has(pin.id)) continue;
      const el = document.createElement("div");
      el.className = "pin";
      el.style.background = pin.color;
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        pinTapAt = Date.now();
        lastEmptyTap = 0;
        showPin(pin);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
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
  new ResizeObserver(() => { try { map.resize(); } catch (e) {} }).observe(document.getElementById("map"));
  if (window.__pendingPins) window.__setPins(window.__pendingPins);
}
</script>
</body>
</html>`;
}

export function DrawerMapLibreGlobe({
  pins,
  backgroundColor,
  width,
  height,
  center,
  onOpen,
  onOpenPressIn,
}: Props) {
  const webRef = useRef<WebView>(null);
  const onOpenRef = useRef(onOpen);
  const onPressRef = useRef(onOpenPressIn);
  onOpenRef.current = onOpen;
  onPressRef.current = onOpenPressIn;
  const html = useMemo(
    () => globeHtml(backgroundColor, center.lat, center.lng),
    [backgroundColor, center.lat, center.lng]
  );
  const payload = useMemo(() => globePins(pins), [pins]);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const pushPins = (list: typeof payload) => {
    webRef.current?.injectJavaScript(
      `window.__pendingPins=${JSON.stringify(list)};window.__setPins&&window.__setPins(window.__pendingPins);true;`
    );
  };

  useEffect(() => {
    pushPins(payload);
  }, [payload]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; url?: string };
      if (data.type === "ready") {
        pushPins(payloadRef.current);
      } else if (data.type === "openUrl" && data.url && /^https:\/\//i.test(data.url)) {
        void Linking.openURL(data.url);
      } else if (data.type === "open") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onOpenRef.current();
      } else if (data.type === "pin") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      /* ignore malformed bridge messages */
    }
  };

  return (
    <View
      style={[styles.fill, { width, height, backgroundColor }]}
      collapsable={false}
      onTouchStart={() => onPressRef.current?.()}
    >
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
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        textZoom={100}
        cacheEnabled
        onMessage={onMessage}
        onTouchStart={() => onPressRef.current?.()}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0.62)"]}
        locations={[0, 0.45, 1]}
        style={styles.haze}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { overflow: "visible" },
  haze: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
  },
});
