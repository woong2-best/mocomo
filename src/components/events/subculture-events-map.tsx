"use client";

import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");

import { useEffect, useRef, useState } from "react";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  Popup as MapLibrePopup,
  StyleSpecification,
} from "maplibre-gl";
import type { MapEventPin } from "@/lib/subculture-events";
import { googleSearchUrlForEvent } from "@/lib/subculture-event-pins";
import { eventCountryFlag } from "@/lib/subculture-event-countries";
import { SUBCULTURE_EVENT_CATEGORY_COLORS } from "@/lib/subculture-event-types";
import { collapseMapLibreAttribution } from "@/lib/maps/maplibre-attribution";
import { loadMapLibre } from "@/lib/maps/maplibre-loader";
import {
  ESRI_SATELLITE_MAX_ZOOM,
  ESRI_WORLD_IMAGERY_TILES,
  MAPLIBRE_GLYPHS_URL,
  MAPLIBRE_LABEL_FONTS,
} from "@/lib/maps/esri-satellite";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

// --- Leaflet (legacy — horizontal tile repeat on zoom-out) ---
// import type { Map as LeafletMap } from "leaflet";
// import "leaflet/dist/leaflet.css";
//
// function pinHtml(color: string) {
//   return `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>`;
// }

const SATELLITE_STYLE = {
  version: 8 as const,
  glyphs: MAPLIBRE_GLYPHS_URL,
  sources: {
    "satellite-tiles": {
      type: "raster" as const,
      tiles: [ESRI_WORLD_IMAGERY_TILES],
      tileSize: 256,
      attribution: "Tiles &copy; Esri",
      maxzoom: ESRI_SATELLITE_MAX_ZOOM,
    },
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster" as const,
      source: "satellite-tiles",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
} satisfies StyleSpecification;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    /* ignore */
  }
  return null;
}

const PIN_TOUCH_BUFFER = 20;
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 16;
/** Visual diameter stays ~20–32px. Do not scale with point_count without a cap. */
const CLUSTER_CIRCLE_RADIUS: ExpressionSpecification = [
  "step",
  ["get", "point_count"],
  12,
  10,
  14,
  50,
  16,
];
const SIDEBAR_CLUSTER_CIRCLE_RADIUS: ExpressionSpecification = [
  "step",
  ["get", "point_count"],
  10,
  10,
  12,
  50,
  14,
];

function pinColor(category: string, halo: boolean) {
  if (halo) return "#ff4d9a";
  return SUBCULTURE_EVENT_CATEGORY_COLORS[category] ?? SUBCULTURE_EVENT_CATEGORY_COLORS.other;
}

function pinsToGeoJSON(pins: MapEventPin[], halo: boolean) {
  return {
    type: "FeatureCollection" as const,
    features: pins
      .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))
      .map((pin) => ({
        type: "Feature" as const,
        id: pin.id,
        geometry: { type: "Point" as const, coordinates: [pin.lng, pin.lat] },
        properties: { id: pin.id, color: pinColor(pin.category, halo) },
      })),
  };
}

function queryNear(
  map: MapLibreMap,
  point: { x: number; y: number },
  layers: string[]
): MapGeoJSONFeature[] {
  const present = layers.filter((id) => map.getLayer(id));
  if (present.length === 0) return [];
  try {
    return map.queryRenderedFeatures(
      [
        [point.x - PIN_TOUCH_BUFFER, point.y - PIN_TOUCH_BUFFER],
        [point.x + PIN_TOUCH_BUFFER, point.y + PIN_TOUCH_BUFFER],
      ],
      { layers: present }
    );
  } catch {
    return [];
  }
}

function featureScreenDist(
  map: MapLibreMap,
  feature: MapGeoJSONFeature,
  point: { x: number; y: number }
) {
  const geom = feature.geometry;
  if (geom.type !== "Point") return Number.POSITIVE_INFINITY;
  const [lng, lat] = geom.coordinates as [number, number];
  try {
    const projected = map.project([lng, lat]);
    return Math.hypot(projected.x - point.x, projected.y - point.y);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function nearestFeature(
  map: MapLibreMap,
  features: MapGeoJSONFeature[],
  point: { x: number; y: number }
) {
  let best: MapGeoJSONFeature | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const feature of features) {
    const dist = featureScreenDist(map, feature, point);
    if (dist < bestDist) {
      bestDist = dist;
      best = feature;
    }
  }
  return best;
}

function expandCluster(map: MapLibreMap, feature: MapGeoJSONFeature) {
  const geom = feature.geometry;
  if (geom.type !== "Point") return;
  const [lng, lat] = geom.coordinates as [number, number];
  const clusterId = Number(feature.properties?.cluster_id);
  const source = map.getSource("event-pins") as GeoJSONSource | undefined;
  const fallback = () => {
    map.easeTo({
      center: [lng, lat],
      zoom: Math.min(ESRI_SATELLITE_MAX_ZOOM, Math.max(map.getZoom() + 1.6, 5)),
      duration: 450,
    });
  };
  if (!source || !Number.isFinite(clusterId)) {
    fallback();
    return;
  }
  void source
    .getClusterExpansionZoom(clusterId)
    .then((zoom) => {
      const next = Math.min(
        ESRI_SATELLITE_MAX_ZOOM,
        Math.max(zoom + 0.15, map.getZoom() + 1.4)
      );
      map.easeTo({ center: [lng, lat], zoom: next, duration: 450 });
    })
    .catch(fallback);
}

function buildPinPopupHtml(pin: MapEventPin): string {
  const imageUrl = safeHttpUrl(pin.imageUrl);
  const roadViewUrl = safeHttpUrl(pin.roadViewImageUrl);

  const imageBlock = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" class="subculture-map-popup-img" loading="lazy" decoding="async" />`
    : "";
  const roadViewBlock = roadViewUrl
    ? `<figure class="subculture-map-popup-roadview"><img src="${escapeHtml(roadViewUrl)}" alt="Street view" loading="lazy" decoding="async" /><figcaption>Street view</figcaption></figure>`
    : "";

  const dateStr =
    pin.category === "maid_cafe" || pin.category === "user_recommendation"
      ? pin.category === "user_recommendation"
        ? "Recommended"
        : "Permanent"
      : format(new Date(pin.startsAt), "M/d", { locale: enUS });
  const phaseBadge =
    pin.phase === "ongoing"
      ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--ongoing">Live now</span>'
      : pin.phase === "upcoming"
        ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--upcoming">Upcoming</span>'
        : "";
  const official =
    pin.source === "official" || pin.source === "auto"
      ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--official">Official</span>'
      : pin.category === "maid_cafe"
        ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--maid">Maid cafe</span>'
        : pin.category === "user_recommendation"
          ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--ongoing">Community pick</span>'
          : "";
  const countryLabel = eventCountryFlag(pin.country);
  const venueBlock = pin.venueName
    ? `<a href="${escapeHtml(googleSearchUrlForEvent(pin))}" target="_blank" rel="noopener noreferrer" class="subculture-map-popup-venue">${escapeHtml(pin.venueName)}</a>`
    : "";

  return `${imageBlock}${roadViewBlock}${phaseBadge}${official}<strong class="subculture-map-popup-title">${escapeHtml(pin.title)}</strong><span class="subculture-map-popup-meta">${countryLabel} ${dateStr}${venueBlock ? ` · ${venueBlock}` : ""}</span>`;
}

/** 핀 클릭 시 위성 뷰 2단계(건물·블록 단위) 줌 */
const PIN_FOCUS_ZOOM = 16;

function fitMapToPins(
  map: MapLibreMap,
  pins: MapEventPin[],
  defaultView?: { lat: number; lng: number; zoom: number }
) {
  if (pins.length === 1) {
    map.setCenter([pins[0]!.lng, pins[0]!.lat]);
    map.setZoom(defaultView?.zoom ?? 11);
    return;
  }
  if (pins.length > 1) {
    const lngs = pins.map((p) => p.lng);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    const maxZoom =
      lngSpan > 40 ? 4 : lngSpan > 20 ? 5 : lngSpan > 8 ? 6 : lngSpan > 4 ? 7 : 10;
    let minLng = lngs[0]!;
    let maxLng = lngs[0]!;
    let minLat = pins[0]!.lat;
    let maxLat = pins[0]!.lat;
    for (const pin of pins) {
      minLng = Math.min(minLng, pin.lng);
      maxLng = Math.max(maxLng, pin.lng);
      minLat = Math.min(minLat, pin.lat);
      maxLat = Math.max(maxLat, pin.lat);
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 32, maxZoom, duration: 0 }
    );
    return;
  }
  if (defaultView) {
    map.setCenter([defaultView.lng, defaultView.lat]);
    map.setZoom(defaultView.zoom);
  } else {
    map.setCenter([133.5, 36.2]);
    map.setZoom(5);
  }
}

export function SubcultureEventsMap({
  pins,
  className,
  heightClassName = "h-44",
  interactive = true,
  showNavigationControls,
  immersive = false,
  onPinClick,
  onMapClick,
  pinDropMode = false,
  onZoomChange,
  defaultView,
  respectDefaultView = false,
  showAttribution = true,
  pinHalo = false,
}: {
  pins: MapEventPin[];
  className?: string;
  heightClassName?: string;
  /** 드래그·휠 줌 등 지도 조작 (false면 정적 미리보기) */
  interactive?: boolean;
  /** +/- 줌 버튼 (기본: immersive 전체화면 지도만) */
  showNavigationControls?: boolean;
  immersive?: boolean;
  onPinClick?: (pin: MapEventPin) => void;
  /** 지도 클릭 (추천 핀 추가 모드) */
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  /** true면 지도 클릭으로 좌표 선택 */
  pinDropMode?: boolean;
  /** Globe void decor — hide Mars overlay once user zooms past ~city level */
  onZoomChange?: (zoom: number) => void;
  defaultView?: { lat: number; lng: number; zoom: number };
  /** true면 fitBounds 생략하고 defaultView 그대로 사용 (지구본 초기 각도) */
  respectDefaultView?: boolean;
  /** false면 Esri 등 타일 저작권 표시 숨김 (사이드바 미리보기) */
  showAttribution?: boolean;
  /** Sidebar preview pins — pink center, white ring, dark halo. */
  pinHalo?: boolean;
}) {
  const navigationControls = showNavigationControls ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<MapLibrePopup | null>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!immersive && pins.length === 0) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      const maplibregl = await loadMapLibre();
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        popupRef.current?.remove();
        popupRef.current = null;
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: SATELLITE_STYLE,
        center: defaultView
          ? [defaultView.lng, defaultView.lat]
          : [135, 28],
        zoom: defaultView?.zoom ?? 3,
        maxZoom: ESRI_SATELLITE_MAX_ZOOM,
        attributionControl: false,
        // Site CSS disables transitions globally; skip canvas fade-in.
        fadeDuration: 0,
      });

      if (!interactive) {
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.dragRotate.disable();
        map.keyboard.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
      } else {
        if (showAttribution) {
          map.addControl(
            new maplibregl.AttributionControl({ compact: true }),
            immersive ? "bottom-left" : "bottom-right"
          );
          const collapseAttribution = () => {
            collapseMapLibreAttribution(map.getContainer());
          };
          collapseAttribution();
          map.once("load", collapseAttribution);
          map.once("idle", collapseAttribution);
        }
        if (navigationControls) {
          map.addControl(
            new maplibregl.NavigationControl({ showCompass: false }),
            immersive ? "bottom-right" : "top-left"
          );
        }
      }

      const resize = () => {
        try {
          map.resize();
        } catch {
          /* ignore */
        }
      };
      const emitZoom = () => onZoomChangeRef.current?.(map.getZoom());
      map.on("zoom", emitZoom);
      map.on("zoomend", emitZoom);
      map.on("moveend", emitZoom);

      map.once("load", () => {
        // Globe after full style+worker init (style.load alone can race worker setup)
        try {
          map.setProjection({ type: "globe" });
        } catch {
          /* mercator fallback */
        }
        if (!map.getSource("event-pins")) {
          map.addSource("event-pins", {
            type: "geojson",
            data: pinsToGeoJSON(pins, pinHalo),
            cluster: true,
            clusterRadius: CLUSTER_RADIUS,
            clusterMaxZoom: CLUSTER_MAX_ZOOM,
          });
          map.addLayer({
            id: "event-clusters",
            type: "circle",
            source: "event-pins",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": pinHalo ? "#ff4d9a" : "#7c3aed",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-radius": [
                "min",
                pinHalo ? SIDEBAR_CLUSTER_CIRCLE_RADIUS : CLUSTER_CIRCLE_RADIUS,
                ["interpolate", ["linear"], ["zoom"], 1, 8, 3, 12, 6, 16],
              ] as ExpressionSpecification,
              "circle-pitch-alignment": "viewport",
              "circle-pitch-scale": "viewport",
            },
          });
          map.addLayer({
            id: "event-cluster-count",
            type: "symbol",
            source: "event-pins",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": pinHalo ? 11 : 12,
              "text-font": [...MAPLIBRE_LABEL_FONTS],
              "text-anchor": "center",
              "text-justify": "center",
              "text-offset": [0, 0],
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: {
              "text-color": "#ffffff",
            },
          });
          map.addLayer({
            id: "event-pins-dot",
            type: "circle",
            source: "event-pins",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-radius": pinHalo ? 8 : 7,
              "circle-color": ["get", "color"],
              "circle-stroke-width": pinHalo ? 3 : 2,
              "circle-stroke-color": "#ffffff",
              "circle-pitch-alignment": "viewport",
              "circle-pitch-scale": "viewport",
            },
          });
        }
        resize();
        if (respectDefaultView && defaultView) {
          map.setCenter([defaultView.lng, defaultView.lat]);
          map.setZoom(defaultView.zoom);
        } else {
          fitMapToPins(map, pins, defaultView);
        }
        emitZoom();
        setReady(true);
      });
      map.once("error", (event) => {
        console.error("[subculture-events-map]", event.error ?? event);
      });
      const pinById = new Map(pins.map((pin) => [pin.id, pin]));
      const openPin = (pin: MapEventPin) => {
        popupRef.current?.remove();
        const popup = new maplibregl.Popup({
          closeButton: false,
          maxWidth: "240px",
          className: "subculture-map-popup",
          offset: 12,
        })
          .setLngLat([pin.lng, pin.lat])
          .setHTML(buildPinPopupHtml(pin))
          .addTo(map);
        popupRef.current = popup;
        map.flyTo({
          center: [pin.lng, pin.lat],
          zoom: Math.min(
            ESRI_SATELLITE_MAX_ZOOM,
            Math.max(map.getZoom(), PIN_FOCUS_ZOOM)
          ),
          duration: 700,
          essential: true,
        });
        onPinClick?.(pin);
      };

      map.on("click", (event) => {
        if (interactive) {
          const clusterHit = nearestFeature(
            map,
            queryNear(map, event.point, ["event-clusters", "event-cluster-count"]),
            event.point
          );
          if (clusterHit) {
            expandCluster(map, clusterHit);
            return;
          }
          const pinHit = nearestFeature(
            map,
            queryNear(map, event.point, ["event-pins-dot"]),
            event.point
          );
          const pinId = pinHit?.properties?.id;
          const pin = pinId == null ? undefined : pinById.get(String(pinId));
          if (pin) {
            openPin(pin);
            return;
          }
        }
        onMapClickRef.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });
      requestAnimationFrame(resize);
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);

      mapRef.current = map;

      // --- Leaflet (legacy) ---
      // const L = (await import("leaflet")).default;
      // const map = L.map(containerRef.current, {
      //   zoomControl: interactive,
      //   attributionControl: interactive,
      //   dragging: interactive,
      //   scrollWheelZoom: interactive,
      //   doubleClickZoom: interactive,
      //   touchZoom: interactive,
      // });
      // L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      //   maxZoom: 19,
      //   attribution: interactive
      //     ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      //     : "",
      // }).addTo(map);
      // for (const pin of pins) {
      //   const color =
      //     SUBCULTURE_EVENT_CATEGORY_COLORS[pin.category] ??
      //     SUBCULTURE_EVENT_CATEGORY_COLORS.other;
      //   const marker = L.marker([pin.lat, pin.lng], {
      //     icon: L.divIcon({
      //       className: "subculture-event-pin",
      //       html: pinHtml(color),
      //       iconSize: [14, 14],
      //       iconAnchor: [7, 7],
      //     }),
      //   }).addTo(map);
      //   const dateStr =
      //     pin.category === "maid_cafe"
      //       ? "상설"
      //       : format(new Date(pin.startsAt), "M/d", { locale: ko });
      //   const official =
      //     pin.source === "official" || pin.source === "auto"
      //       ? '<span style="font-size:10px;color:#7c3aed">Official auto</span><br/>'
      //       : pin.category === "maid_cafe"
      //         ? '<span style="font-size:10px;color:#ec4899">Maid cafe</span><br/>'
      //         : "";
      //   const countryLabel = eventCountryFlag(pin.country);
      //   const popup = `${official}<strong>${pin.title}</strong><br/><span style="font-size:11px">${countryLabel} ${dateStr} · ${pin.venueName ?? ""}</span>`;
      //   marker.bindPopup(popup, { closeButton: false, maxWidth: 200 });
      //   if (onPinClick) {
      //     marker.on("click", () => onPinClick(pin));
      //   }
      //   bounds.push([pin.lat, pin.lng]);
      // }
      // if (bounds.length === 1) {
      //   map.setView(bounds[0], defaultView?.zoom ?? 11);
      // } else if (bounds.length > 1) {
      //   const lngs = bounds.map((b) => b[1]);
      //   const lngSpan = Math.max(...lngs) - Math.min(...lngs);
      //   map.fitBounds(bounds, {
      //     padding: [32, 32],
      //     maxZoom: lngSpan > 40 ? 4 : lngSpan > 20 ? 5 : lngSpan > 8 ? 6 : lngSpan > 4 ? 7 : 10,
      //   });
      // } else if (defaultView) {
      //   map.setView([defaultView.lat, defaultView.lng], defaultView.zoom);
      // } else {
      //   map.setView([36.2, 133.5], 5);
      // }
      // mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pins identity drives rebuild
  }, [pins, interactive, navigationControls, defaultView, immersive, showAttribution, pinHalo]);

  if (!immersive && pins.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground bg-muted/30",
          heightClassName,
          className
        )}
      >
        No events to show
      </div>
    );
  }

  return (
    <div
      className={cn(
        immersive
          ? "absolute inset-0 overflow-hidden subculture-events-map subculture-events-map--immersive"
          : "relative rounded-xl overflow-hidden border border-border/60 subculture-events-map",
        !immersive && heightClassName,
        className
      )}
      data-functional-canvas
      data-pin-drop={pinDropMode ? "true" : undefined}
    >
      <div
        ref={containerRef}
        className={cn(
          immersive ? cn("w-full h-full z-0", heightClassName) : "absolute inset-0 z-0 h-full w-full"
        )}
      />
      {pinDropMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          지도를 클릭해 장소를 추가하세요
        </div>
      )}
      {!ready && (
        <div
          className={cn(
            "absolute inset-0 z-10 flex min-w-0 items-center justify-center overflow-hidden px-2 text-center",
            immersive
              ? "text-white/70 bg-black"
              : "text-muted-foreground bg-muted/40"
          )}
        >
          <span className="max-w-full truncate text-[11px] leading-snug sm:text-xs">
            Loading map…
          </span>
        </div>
      )}
    </div>
  );
}
