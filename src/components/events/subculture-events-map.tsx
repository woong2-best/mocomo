"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { MapEventPin } from "@/lib/subculture-events";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import "leaflet/dist/leaflet.css";

const CATEGORY_COLORS: Record<string, string> = {
  comic: "#8b5cf6",
  anime: "#3b82f6",
  cosplay: "#ec4899",
  goods: "#f59e0b",
  other: "#64748b",
};

function pinHtml(color: string) {
  return `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,.35)"></div>`;
}

export function SubcultureEventsMap({
  pins,
  className,
  heightClassName = "h-44",
  interactive = true,
  onPinClick,
}: {
  pins: MapEventPin[];
  className?: string;
  heightClassName?: string;
  interactive?: boolean;
  onPinClick?: (pin: MapEventPin) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        zoomControl: interactive,
        attributionControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: interactive
          ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          : "",
      }).addTo(map);

      const bounds: [number, number][] = [];

      for (const pin of pins) {
        const color = CATEGORY_COLORS[pin.category] ?? CATEGORY_COLORS.other;
        const marker = L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            className: "subculture-event-pin",
            html: pinHtml(color),
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        }).addTo(map);

        const dateStr = format(new Date(pin.startsAt), "M/d", { locale: ko });
        const official =
          pin.source === "official" || pin.source === "auto"
            ? '<span style="font-size:10px;color:#7c3aed">공식 자동</span><br/>'
            : "";
        const countryLabel = pin.country === "jp" ? "🇯🇵" : "🇰🇷";
        const popup = `${official}<strong>${pin.title}</strong><br/><span style="font-size:11px">${countryLabel} ${dateStr} · ${pin.venueName ?? ""}</span>`;
        marker.bindPopup(popup, { closeButton: false, maxWidth: 200 });

        if (onPinClick) {
          marker.on("click", () => onPinClick(pin));
        }

        bounds.push([pin.lat, pin.lng]);
      }

      if (bounds.length === 1) {
        map.setView(bounds[0], pins[0].country === "jp" ? 11 : 12);
      } else if (bounds.length > 1) {
        const lngs = bounds.map((b) => b[1]);
        const lngSpan = Math.max(...lngs) - Math.min(...lngs);
        map.fitBounds(bounds, {
          padding: [32, 32],
          maxZoom: lngSpan > 8 ? 5 : lngSpan > 4 ? 6 : 10,
        });
      } else {
        map.setView([36.2, 133.5], 5);
      }

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pins identity drives rebuild
  }, [pins, interactive]);

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
    <div className={cn("relative rounded-xl overflow-hidden border border-border/60", className)}>
      <div ref={containerRef} className={cn("w-full z-0", heightClassName)} />
      {!ready && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-muted/40",
            heightClassName
          )}
        >
          지도 불러오는 중…
        </div>
      )}
    </div>
  );
}
