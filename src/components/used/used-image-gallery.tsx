"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { SensitiveMediaFrame } from "@/components/media/sensitive-media-frame";

export function UsedImageGallery({
  images,
  statusBadge,
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
}: {
  images: string[];
  statusBadge?: string;
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const current = images[idx];

  if (!images.length) {
    return (
      <div className="aspect-square max-h-[min(70vh,480px)] bg-muted/30 flex items-center justify-center">
        <ImageOff className="h-16 w-16 text-muted-foreground/30" />
      </div>
    );
  }

  const wrap = (node: ReactNode, className?: string) => (
    <SensitiveMediaFrame
      isNsfw={isNsfw}
      isOwner={isOwner}
      viewerShowNsfw={viewerShowNsfw}
      className={className}
    >
      {node}
    </SensitiveMediaFrame>
  );

  return (
    <div className="relative bg-black/90">
      <div className="aspect-square max-h-[min(70vh,480px)] relative w-full">
        {wrap(
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="h-full w-full object-contain" />,
          "h-full w-full"
        )}
        {statusBadge && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-bold z-10">
            {statusBadge}
          </span>
        )}
        {images.length > 1 && (
          <>
            <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs tabular-nums z-10">
              {idx + 1}/{images.length}
            </span>
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center z-10"
              onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              aria-label={t("used.sz0uo")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center z-10"
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              aria-label={t("seller.next")}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
