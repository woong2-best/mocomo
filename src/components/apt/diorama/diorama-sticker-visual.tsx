"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { materialFilterForSticker } from "@/lib/diorama/sticker-material-css";
import { BONDEE_STICKER_SHADOW } from "@/lib/apt/style/bondee-color-bible";

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
  const materialFilter = gameMode ? materialFilterForSticker(typeId) : undefined;
  const shadow = gameMode ? BONDEE_STICKER_SHADOW : undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      draggable={false}
      className={cn(
        "pointer-events-none relative z-0 h-auto w-full select-none",
        gameMode && "apt-bondee-sticker",
        selected && gameMode && "drop-shadow-[0_0_14px_rgba(251,191,36,0.35)]",
        className
      )}
      style={
        gameMode
          ? { filter: [materialFilter, shadow].filter(Boolean).join(" ") || undefined }
          : undefined
      }
    />
  );
}

export const DioramaStickerVisual = memo(DioramaStickerVisualInner);

/** @deprecated SVG placeholders removed — always use catalog WebP */
export function hasSvgSticker(_typeId: string) {
  return false;
}
