"use client";

import { Megaphone, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type SponsorAdPreviewFrameProps = {
  imageUrl?: string | null;
  title?: string;
  ctaLabel?: string;
  className?: string;
  /** 헤더(스폰서 라벨) 숨김 — 크롭 다이얼로그 등 좁은 공간 */
  hideHeader?: boolean;
};

export function SponsorAdPreviewFrame({
  imageUrl,
  title,
  ctaLabel,
  className,
  hideHeader = false,
}: SponsorAdPreviewFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-folk-gold/40 bg-folk-gold/5",
        className
      )}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 pb-2">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-folk-terracotta">
            <Megaphone className="h-4 w-4 shrink-0" />
            스폰서
          </div>
          <div
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-folk-terracotta/30 text-folk-terracotta"
            aria-hidden
          >
            <Plus className="h-4 w-4" />
          </div>
        </div>
      )}
      <div className="relative w-full overflow-hidden">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="block w-full aspect-[4/5] object-cover" />
            {(title || ctaLabel) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10">
                {title ? (
                  <p className="text-sm font-bold text-white line-clamp-2">{title}</p>
                ) : null}
                {ctaLabel ? (
                  <p className="text-[11px] font-semibold text-folk-gold mt-0.5">{ctaLabel} →</p>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center bg-muted/40 text-xs text-muted-foreground">
            이미지 미리보기
          </div>
        )}
      </div>
    </div>
  );
}
