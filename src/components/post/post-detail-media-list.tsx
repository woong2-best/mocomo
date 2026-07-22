"use client";

import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";

type MediaItem = {
  id: string;
  url: string;
  type: string;
  priceKrw?: number | null;
};

export function PostDetailMediaList({
  media,
  instantPurchasePriceKrw,
}: {
  media: MediaItem[];
  instantPurchasePriceKrw?: number | null;
}) {
  if (media.length === 0) return null;

  return (
    <div className="space-y-3">
      {media.map((m) => (
        <ProtectedPaidMedia
          key={m.id}
          type={m.type}
          src={m.url}
          className="rounded-lg max-w-full w-full"
          mediaPriceKrw={m.priceKrw}
          postInstantPurchasePriceKrw={instantPurchasePriceKrw}
          mediaId={m.id}
          autoPlayOnView
        />
      ))}
    </div>
  );
}
