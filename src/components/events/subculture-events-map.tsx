"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  StyleSpecification,
} from "maplibre-gl";
import type { MapEventPin } from "@/lib/subculture-events";
import { googleSearchUrlForEvent } from "@/lib/subculture-event-pins";
import { eventCountryFlag } from "@/lib/subculture-event-countries";
import { SUBCULTURE_EVENT_CATEGORY_COLORS } from "@/lib/subculture-event-types";
import { loadMapLibre } from "@/lib/maps/maplibre-loader";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// --- Leaflet (legacy — horizontal tile repeat on zoom-out) ---
// import type { Map as LeafletMap } from "leaflet";
// import "leaflet/dist/leaflet.css";
//
// function pinHtml(color: string) {
//   return `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>`;
// }

const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "satellite-tiles": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles &copy; Esri",
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

function createPinElement(color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "subculture-event-pin";
  el.style.cssText = `width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.35);cursor:pointer`;
  return el;
}

function buildPinPopupHtml(pin: MapEventPin): string {
  const imageUrl = safeHttpUrl(pin.imageUrl);
  const roadViewUrl = safeHttpUrl(pin.roadViewImageUrl);

  const imageBlock = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="" class="subculture-map-popup-img" loading="lazy" decoding="async" />`
    : "";
  const roadViewBlock = roadViewUrl
    ? `<figure class="subculture-map-popup-roadview"><img src="${escapeHtml(roadViewUrl)}" alt="로드뷰" loading="lazy" decoding="async" /><figcaption>로드뷰</figcaption></figure>`
    : "";

  const dateStr =
    pin.category === "maid_cafe"
      ? "상설"
      : format(new Date(pin.startsAt), "M/d", { locale: ko });
  const official =
    pin.source === "official" || pin.source === "auto"
      ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--official">공식 자동</span>'
      : pin.category === "maid_cafe"
        ? '<span class="subculture-map-popup-badge subculture-map-popup-badge--maid">메이드 카페</span>'
        : "";
  const countryLabel = eventCountryFlag(pin.country);
  const venueBlock = pin.venueName
    ? `<a href="${escapeHtml(googleSearchUrlForEvent(pin))}" target="_blank" rel="noopener noreferrer" class="subculture-map-popup-venue">${escapeHtml(pin.venueName)}</a>`
    : "";

  return `${imageBlock}${roadViewBlock}${official}<strong class="subculture-map-popup-title">${escapeHtml(pin.title)}</strong><span class="subculture-map-popup-meta">${countryLabel} ${dateStr}${venueBlock ? ` · ${venueBlock}` : ""}</span>`;
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
  immersive = false,
  onPinClick,
  onZoomChange,
  defaultView,
}: {
  pins: MapEventPin[];
  className?: string;
  heightClassName?: string;
  interactive?: boolean;
  immersive?: boolean;
  onPinClick?: (pin: MapEventPin) => void;
  /** Globe void decor — hide Mars overlay once user zooms past ~city level */
  onZoomChange?: (zoom: number) => void;
  defaultView?: { lat: number; lng: number; zoom: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      const maplibregl = await loadMapLibre();
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        for (const marker of markersRef.current) marker.remove();
        markersRef.current = [];
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
        attributionControl: interactive ? { compact: true } : false,
        // Site CSS disables transitions globally; skip canvas fade-in.
        fadeDuration: 0,
      });

      if (interactive) {
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          immersive ? "bottom-right" : "top-left"
        );
      } else {
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.dragRotate.disable();
        map.keyboard.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
      }

      const resize = () => {
        try {
          map.resize();
        } catch {
          /* ignore */
        }
      };
      const emitZoom = () => onZoomChange?.(map.getZoom());
      map.on("zoom", emitZoom);
      map.on("moveend", emitZoom);

      map.once("load", () => {
        // Globe after full style+worker init (style.load alone can race worker setup)
        try {
          map.setProjection({ type: "globe" });
        } catch {
          /* mercator fallback */
        }
        resize();
        fitMapToPins(map, pins, defaultView);
        emitZoom();
        setReady(true);
      });
      map.once("error", (event) => {
        console.error("[subculture-events-map]", event.error ?? event);
      });
      requestAnimationFrame(resize);
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);

      for (const pin of pins) {
        const color =
          SUBCULTURE_EVENT_CATEGORY_COLORS[pin.category] ??
          SUBCULTURE_EVENT_CATEGORY_COLORS.other;
        const popup = new maplibregl.Popup({
          closeButton: false,
          maxWidth: "240px",
          className: "subculture-map-popup",
          offset: 12,
        }).setHTML(buildPinPopupHtml(pin));

        const marker = new maplibregl.Marker({ element: createPinElement(color) })
          .setLngLat([pin.lng, pin.lat])
          .setPopup(popup)
          .addTo(map);

        marker.getElement().addEventListener("click", () => {
          map.flyTo({
            center: [pin.lng, pin.lat],
            zoom: Math.max(map.getZoom(), PIN_FOCUS_ZOOM),
            duration: 700,
            essential: true,
          });
          onPinClick?.(pin);
        });

        markersRef.current.push(marker);
      }

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
      //       ? '<span style="font-size:10px;color:#7c3aed">공식 자동</span><br/>'
      //       : pin.category === "maid_cafe"
      //         ? '<span style="font-size:10px;color:#ec4899">메이드 카페</span><br/>'
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
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pins identity drives rebuild
  }, [pins, interactive, defaultView]);

  if (pins.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground bg-muted/30",
          heightClassName,
          className
        )}
      >
        표시할 행사가 없습니다
      </div>
    );
  }

  return (
    <div
      className={cn(
        immersive
          ? "absolute inset-0 overflow-hidden subculture-events-map subculture-events-map--immersive"
          : "relative rounded-xl overflow-hidden border border-border/60 subculture-events-map",
        className
      )}
      data-functional-canvas
    >
      <div ref={containerRef} className={cn("w-full h-full z-0", heightClassName)} />
      {!ready && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center text-xs z-10",
            immersive
              ? "text-white/70 bg-black"
              : "text-muted-foreground bg-muted/40",
            heightClassName
          )}
        >
          지도 불러오는 중…
        </div>
      )}
    </div>
  );
}
