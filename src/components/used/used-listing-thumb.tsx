"use client";

import { ImageOff } from "lucide-react";
import { SensitiveMediaFrame } from "@/components/media/sensitive-media-frame";
import { cn } from "@/lib/utils";

export function UsedListingThumb({
  thumb,
  dense = false,
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
}: {
  thumb: string | null;
  dense?: boolean;
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
}) {
  if (!thumb) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ImageOff
          className={cn("text-muted-foreground/35", dense ? "h-7 w-7" : "h-10 w-10")}
        />
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
        src={thumb}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
      />
    </SensitiveMediaFrame>
  );
}
