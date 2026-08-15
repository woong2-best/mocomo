"use client";

import { SensitiveMediaFrame } from "@/components/media/sensitive-media-frame";

export function MarketplaceListingMedia({
  coverUrl,
  mediaUrls,
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
}: {
  coverUrl: string | null;
  mediaUrls: string[];
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
}) {
  const hero = coverUrl ?? mediaUrls[0] ?? null;
  const thumbs = mediaUrls.filter((url) => url && url !== hero);

  return (
    <div className="space-y-2">
      <div className="aspect-square overflow-hidden rounded-2xl bg-muted/40">
        {hero ? (
          <SensitiveMediaFrame
            isNsfw={isNsfw}
            isOwner={isOwner}
            viewerShowNsfw={viewerShowNsfw}
            className="h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" className="h-full w-full object-cover" />
          </SensitiveMediaFrame>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            이미지 없음
          </div>
        )}
      </div>
      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {thumbs.slice(0, 8).map((url) => (
            <SensitiveMediaFrame
              key={url}
              isNsfw={isNsfw}
              isOwner={isOwner}
              viewerShowNsfw={viewerShowNsfw}
              className="aspect-square overflow-hidden rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </SensitiveMediaFrame>
          ))}
        </div>
      )}
    </div>
  );
}
