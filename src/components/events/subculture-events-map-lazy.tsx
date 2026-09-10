"use client";

import dynamic from "next/dynamic";
import type { MapEventPin } from "@/lib/subculture-events";
import { cn } from "@/lib/utils";

const SubcultureEventsMapInner = dynamic(
  () =>
    import("@/components/events/subculture-events-map").then(
      (m) => m.SubcultureEventsMap
    ),
  { ssr: false }
);

export function SubcultureEventsMapLazy({
  pins,
  heightClassName = "h-44",
  className,
  interactive = true,
  showNavigationControls,
  immersive = false,
  onPinClick,
  onZoomChange,
  defaultView,
  respectDefaultView,
}: {
  pins: MapEventPin[];
  heightClassName?: string;
  className?: string;
  interactive?: boolean;
  showNavigationControls?: boolean;
  immersive?: boolean;
  onPinClick?: (pin: MapEventPin) => void;
  onZoomChange?: (zoom: number) => void;
  defaultView?: { lat: number; lng: number; zoom: number };
  respectDefaultView?: boolean;
}) {
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
    <SubcultureEventsMapInner
      pins={pins}
      heightClassName={immersive ? "h-full" : heightClassName}
      className={className}
      interactive={interactive}
      showNavigationControls={showNavigationControls}
      immersive={immersive}
      onPinClick={onPinClick}
      onZoomChange={onZoomChange}
      defaultView={defaultView}
      respectDefaultView={respectDefaultView}
    />
  );
}
