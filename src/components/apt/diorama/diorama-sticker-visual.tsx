"use client";

import { memo, type ReactElement } from "react";
import {
  BedSvg,
  BookshelfSvg,
  ClockSvg,
  CoffeeTableSvg,
  DeskSvg,
  LampSvg,
  PlantSvg,
  RugSvg,
  SofaSvg,
  TvSvg,
} from "@/components/apt/diorama/diorama-sprites";
import { cn } from "@/lib/utils";

const SVG_MAP: Record<string, (props: { x: number; y: number }) => ReactElement> = {
  sofa: SofaSvg,
  bed: BedSvg,
  tv: TvSvg,
  plant: PlantSvg,
  lamp: LampSvg,
  rug: RugSvg,
  "coffee-table": CoffeeTableSvg,
  desk: DeskSvg,
  clock: ClockSvg,
  bookshelf: BookshelfSvg,
  shelf: BookshelfSvg,
};

export function hasSvgSticker(typeId: string) {
  return typeId in SVG_MAP;
}

function DioramaStickerVisualInner({
  typeId,
  label,
  src,
  gameMode,
  selected,
  className,
}: {
  typeId: string;
  label: string;
  src: string;
  gameMode?: boolean;
  selected?: boolean;
  className?: string;
}) {
  const Svg = gameMode ? SVG_MAP[typeId] : undefined;

  if (Svg) {
    return (
      <div
        className={cn(
          "pointer-events-none relative w-full select-none",
          selected && "drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]",
          className
        )}
      >
        <svg viewBox="-100 -80 200 160" className="h-auto w-full overflow-visible" aria-hidden>
          <Svg x={0} y={10} />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      draggable={false}
      className={cn(
        "pointer-events-none relative z-0 h-auto w-full select-none",
        gameMode && "drop-shadow-[0_6px_10px_rgba(40,30,20,0.2)]",
        className
      )}
    />
  );
}

export const DioramaStickerVisual = memo(DioramaStickerVisualInner);
