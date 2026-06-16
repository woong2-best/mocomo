"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchasePostMediaButton } from "@/components/profile/purchase-post-media-button";

export type ProfilePostMediaItem = {
  id?: string;
  url: string;
  type: string;
  priceKrw?: number;
  locked?: boolean;
};

export function PaidPostMediaGrid({
  media,
  postId,
  authorUsername,
  paymentsEnabled,
  linkToPost = true,
  className,
}: {
  media: ProfilePostMediaItem[];
  postId: string;
  authorUsername: string;
  paymentsEnabled: boolean;
  linkToPost?: boolean;
  className?: string;
}) {
  if (media.length === 0) return null;

  const grid = (
    <div
      className={cn(
        "mt-3 grid gap-1 rounded-2xl overflow-hidden border border-border/50",
        media.length > 1 ? "grid-cols-2" : "grid-cols-1",
        className
      )}
    >
      {media.slice(0, 4).map((m) => (
        <PaidPostMediaTile
          key={m.id}
          media={m}
          postId={postId}
          authorUsername={authorUsername}
          paymentsEnabled={paymentsEnabled}
        />
      ))}
    </div>
  );

  if (!linkToPost) return grid;

  return (
    <Link href={`/post/${postId}`} className="block">
      {grid}
    </Link>
  );
}

function PaidPostMediaTile({
  media,
  postId,
  authorUsername,
  paymentsEnabled,
}: {
  media: ProfilePostMediaItem;
  postId: string;
  authorUsername: string;
  paymentsEnabled: boolean;
}) {
  const locked = !!media.locked && (media.priceKrw ?? 0) > 0 && !!media.id;

  return (
    <div className="relative aspect-square bg-muted/30 overflow-hidden">
      {media.type === "VIDEO" ? (
        <video
          src={media.url}
          className={cn("w-full h-full object-cover", locked && "blur-xl scale-105")}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt=""
          className={cn("w-full h-full object-cover", locked && "blur-xl scale-105")}
        />
      )}

      {locked && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25"
          onClick={(e) => e.preventDefault()}
        >
          <div
            className="flex flex-col items-center gap-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/30">
              <Lock className="h-5 w-5" />
            </div>
            <PurchasePostMediaButton
              mediaId={media.id}
              priceKrw={media.priceKrw ?? 0}
              paymentsEnabled={paymentsEnabled}
              username={authorUsername}
              postId={postId}
            />
          </div>
        </div>
      )}

      {media.type === "VIDEO" && !locked && (
        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
          영상
        </span>
      )}
    </div>
  );
}
