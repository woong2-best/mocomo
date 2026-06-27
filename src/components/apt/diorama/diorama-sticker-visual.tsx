"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

function DioramaStickerVisualInner({
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
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      draggable={false}
      className={cn(
        "pointer-events-none relative z-0 h-auto w-full select-none",
        gameMode &&
          "drop-shadow-[0_8px_16px_rgba(35,25,15,0.22)] saturate-[1.02] contrast-[1.02]",
        selected &&
          gameMode &&
          "drop-shadow-[0_0_14px_rgba(251,191,36,0.45)]",
        className
      )}
    />
  );
}

export const DioramaStickerVisual = memo(DioramaStickerVisualInner);

/** @deprecated SVG placeholders removed — always use catalog WebP */
export function hasSvgSticker(_typeId: string) {
  return false;
}
