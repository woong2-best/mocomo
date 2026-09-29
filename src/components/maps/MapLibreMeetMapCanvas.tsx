"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker, Popup as MapLibrePopup, StyleSpecification } from "maplibre-gl";
import { loadMapLibre } from "@/lib/maps/maplibre-loader";
import type { MeetCoords } from "@/lib/maps/types";
import { cn } from "@/lib/utils";

type MarkerPopup = {
  title: string;
  searchUrl: string;
  mapUrl: string;
};

type Props = {
  mode: "view" | "pick";
  center: MeetCoords;
  zoom: number;
  marker: MeetCoords | null;
  markerPopup?: MarkerPopup | null;
  onPick?: (coords: MeetCoords) => void;
  onError?: (message: string) => void;
  onReady?: () => void;
  className?: string;
};

const ESRI_SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    "satellite-tiles": {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popupHtml(popup: MarkerPopup) {
  const links = [
    popup.searchUrl
      ? `<a href="${escapeHtml(popup.searchUrl)}" target="_blank" rel="noopener noreferrer">Google 검색</a>`
      : "",
    popup.mapUrl
      ? `<a href="${escapeHtml(popup.mapUrl)}" target="_blank" rel="noopener noreferrer">Google 지도</a>`
      : "",
  ].filter(Boolean);
  const linkBlock = links.length ? `<div class="meet-map-popup-links">${links.join("")}</div>` : "";
  return `<strong class="meet-map-popup-title">${escapeHtml(popup.title)}</strong>${linkBlock}`;
}

export function MapLibreMeetMapCanvas({
  mode,
  center,
  zoom,
  marker,
  markerPopup,
  onPick,
  onError,
  onReady,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const popupRef = useRef<MapLibrePopup | null>(null);
  const onPickRef = useRef(onPick);
  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);
  onPickRef.current = onPick;
  onErrorRef.current = onError;
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    void (async () => {
      if (!containerRef.current) return;
      try {
        const maplibregl = await loadMapLibre();
        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: ESRI_SATELLITE_STYLE,
          center: [center.lng, center.lat],
          zoom,
          attributionControl: {},
          fadeDuration: 0,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;

        const resize = () => {
          try {
            map.resize();
          } catch {
            /* ignore */
          }
        };
        map.once("load", () => {
          resize();
          onReadyRef.current?.();
        });
        requestAnimationFrame(resize);
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(containerRef.current);

        if (mode === "pick") {
          map.on("click", (e) => {
            onPickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          });
        }

        if (marker) {
          markerRef.current = new maplibregl.Marker({ color: "#EF4444" })
            .setLngLat([marker.lng, marker.lat])
            .addTo(map);
        }
      } catch (err) {
        onErrorRef.current?.(
          err instanceof Error ? err.message : "MapLibre 지도를 불러오지 못했습니다."
        );
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    mapRef.current?.easeTo({ center: [center.lng, center.lat], zoom });
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void loadMapLibre().then((maplibregl) => {
      popupRef.current?.remove();
      popupRef.current = null;

      if (!marker) {
        markerRef.current?.remove();
        markerRef.current = null;
        return;
      }

      if (markerRef.current) {
        markerRef.current.setLngLat([marker.lng, marker.lat]);
      } else {
        markerRef.current = new maplibregl.Marker({ color: "#EF4444" })
          .setLngLat([marker.lng, marker.lat])
          .addTo(map);
      }

      if (mode === "view" && markerPopup) {
        const el = markerRef.current.getElement();
        el.style.cursor = "pointer";
        const openPopup = () => {
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({
            className: "meet-map-popup",
            closeButton: true,
            closeOnClick: true,
            maxWidth: "240px",
            offset: 14,
          })
            .setLngLat([marker.lng, marker.lat])
            .setHTML(popupHtml(markerPopup))
            .addTo(map);
        };
        el.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          openPopup();
        };
      }
    });
  }, [marker?.lat, marker?.lng, mode, markerPopup]);

  return <div ref={containerRef} className={cn("absolute inset-0 meet-map-canvas", className)} />;
}
