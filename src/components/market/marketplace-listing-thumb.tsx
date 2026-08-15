"use client";

import { SensitiveMediaFrame } from "@/components/media/sensitive-media-frame";

export function MarketplaceListingThumb({
  coverUrl,
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
}: {
  coverUrl: string | null;
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
}) {
  if (!coverUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-folk-cream to-muted/60">
        <span className="text-[11px] font-medium text-muted-foreground/70">No image</span>
      </div>
    );
  }

  return (
    <SensitiveMediaFrame
      isNsfw={isNsfw}
      isOwner={isOwner}
      viewerShowNsfw={viewerShowNsfw}
      className="h-full w-full"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverUrl}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    </SensitiveMediaFrame>
  );
}
