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
  onPinClick,
}: {
  pins: MapEventPin[];
  heightClassName?: string;
  className?: string;
  interactive?: boolean;
  onPinClick?: (pin: MapEventPin) => void;
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
      heightClassName={heightClassName}
      className={className}
      interactive={interactive}
      onPinClick={onPinClick}
    />
  );
}
