"use client";

import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");

import { useEffect, useRef, useState } from "react";
import type {
  Map as MapLibreMap,
  Popup as MapLibrePopup,
  StyleSpecification,
} from "maplibre-gl";
import type { MapEventPin } from "@/lib/subculture-events";
import { googleSearchUrlForEvent } from "@/lib/subculture-event-pins";
import { eventCountryFlag } from "@/lib/subculture-event-countries";
import { collapseMapLibreAttribution } from "@/lib/maps/maplibre-attribution";
import { loadMapLibre } from "@/lib/maps/maplibre-loader";
import {
  CLUMP_SEPARATE_MAX_ZOOM,
  PIN_FOCUS_ZOOM,
  clumpIsSameSpot,
  clumpLngLatBounds,
  geoCentroid,
  pileAroundNearest,
  type ScreenPt,
} from "@/lib/maps/pin-clump";
import {
  ESRI_SATELLITE_MAX_ZOOM,
  ESRI_WORLD_IMAGERY_TILES,
  MAPLIBRE_GLYPHS_URL,
} from "@/lib/maps/esri-satellite";
import {
  mapPinCirclePaint,
  mapPinColorForCategory,
} from "@/lib/maps/map-pin";
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

/** Pins within this many screen pixels count as one pile. */
const CLUMP_RADIUS_PX = 44;

function pinColor(category: string, halo: boolean) {
  return mapPinColorForCategory(category, halo);
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
        ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--maid notranslate" translate="no">Maid Cafe</span>'
        : pin.category === "user_recommendation"
          ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--ongoing">Community pick</span>'
          : "";
  const countryLabel = eventCountryFlag(pin.country);
  const venueBlock = pin.venueName
    ? `<a href="${escapeHtml(googleSearchUrlForEvent(pin))}" target="_blank" rel="noopener noreferrer" class="subculture-map-popup-venue">${escapeHtml(pin.venueName)}</a>`
    : "";

  return `${imageBlock}${roadViewBlock}${phaseBadge}${official}<strong class="subculture-map-popup-title">${escapeHtml(pin.title)}</strong><span class="subculture-map-popup-meta">${countryLabel} ${dateStr}${venueBlock ? ` · ${venueBlock}` : ""}</span>`;
}

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
        void (async () => {
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
              promoteId: "id",
            });
            map.addLayer({
              id: "event-pins-shadow",
              type: "circle",
              source: "event-pins",
              paint: mapPinCirclePaint("shadow", pinHalo),
            });
            map.addLayer({
              id: "event-pins-outer",
              type: "circle",
              source: "event-pins",
              paint: mapPinCirclePaint("outer", pinHalo),
            });
            map.addLayer({
              id: "event-pins-inner",
              type: "circle",
              source: "event-pins",
              paint: mapPinCirclePaint("inner", pinHalo),
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
          if (!cancelled) setReady(true);
        })();
      });
      map.once("error", (event) => {
        console.error("[subculture-events-map]", event.error ?? event);
      });
      const projectPin = (pin: MapEventPin): ScreenPt => {
        const projected = map.project([pin.lng, pin.lat]);
        return { x: projected.x, y: projected.y };
      };
      const pileAtPoint = (point: ScreenPt) =>
        pileAroundNearest(pins, projectPin, point, CLUMP_RADIUS_PX);
      const zoomToSeparatePile = (group: MapEventPin[]) => {
        const center = geoCentroid(group);
        const bounds = clumpLngLatBounds(group);
        if (!bounds || clumpIsSameSpot(group)) {
          map.easeTo({
            center: [center.lng, center.lat],
            zoom: Math.min(CLUMP_SEPARATE_MAX_ZOOM, ESRI_SATELLITE_MAX_ZOOM),
            duration: 500,
          });
          return;
        }
        map.fitBounds(
          [
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat],
          ],
          {
            padding: 80,
            maxZoom: CLUMP_SEPARATE_MAX_ZOOM,
            duration: 500,
          }
        );
      };
      const openPin = (pin: MapEventPin) => {
        popupRef.current?.remove();
        const popup = new maplibregl.Popup({
          closeButton: false,
          maxWidth: "240px",
          className: "subculture-map-popup",
          offset: 24,
        })
          .setLngLat([pin.lng, pin.lat])
          .setHTML(buildPinPopupHtml(pin))
          .addTo(map);
        popupRef.current = popup;
        map.easeTo({
          center: [pin.lng, pin.lat],
          zoom: Math.min(
            ESRI_SATELLITE_MAX_ZOOM,
            Math.max(map.getZoom(), PIN_FOCUS_ZOOM)
          ),
          duration: 500,
        });
        onPinClick?.(pin);
      };

      let hoveredPinId: string | number | null = null;
      const setPinHover = (id: string | number | null) => {
        if (hoveredPinId === id) return;
        if (hoveredPinId != null) {
          try {
            map.setFeatureState({ source: "event-pins", id: hoveredPinId }, { hover: false });
          } catch {
            /* ignore */
          }
        }
        hoveredPinId = id;
        if (id != null) {
          try {
            map.setFeatureState({ source: "event-pins", id }, { hover: true });
          } catch {
            /* ignore */
          }
        }
      };
      map.on("mousemove", (event) => {
        if (!interactive) return;
        const pile = pileAtPoint(event.point);
        map.getCanvas().style.cursor = pile.length > 0 ? "pointer" : "";
        setPinHover(pile[0]?.id ?? null);
      });
      map.getCanvas().addEventListener("mouseleave", () => setPinHover(null));
      map.on("click", (event) => {
        if (interactive) {
          const pile = pileAtPoint(event.point);
          if (pile.length >= 2) {
            popupRef.current?.remove();
            popupRef.current = null;
            if (map.getZoom() >= CLUMP_SEPARATE_MAX_ZOOM - 0.05) {
              openPin(pile[0]!);
              return;
            }
            zoomToSeparatePile(pile);
            return;
          }
          if (pile[0]) {
            openPin(pile[0]);
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
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
          translate="no"
        >
          {i18n("events.sby91fj")}
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
