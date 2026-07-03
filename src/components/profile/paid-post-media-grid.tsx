"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchasePostMediaButton } from "@/components/profile/purchase-post-media-button";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import {
  SubscribeCreatorButton,
  SubscribeCreatorHint,
} from "@/components/monetization/subscribe-creator-button";
import type { ContentLockReason } from "@/lib/content-access";

export type ProfilePostMediaItem = {
  id?: string;
  url: string;
  type: string;
  priceKrw?: number;
  instantPurchasePriceKrw?: number;
  locked?: boolean;
  lockReason?: ContentLockReason;
};

export function PaidPostMediaGrid({
  media,
  postId,
  authorUsername,
  authorId,
  subscriptionPriceKrw,
  paymentsEnabled,
  subscribed = false,
  linkToPost = true,
  postInstantPurchasePriceKrw,
  className,
}: {
  media: ProfilePostMediaItem[];
  postId: string;
  authorUsername: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  paymentsEnabled: boolean;
  subscribed?: boolean;
  linkToPost?: boolean;
  postInstantPurchasePriceKrw?: number;
  className?: string;
}) {
  if (media.length === 0) return null;

  const grid = (
    <div
      className={cn(
        "mt-3 grid gap-1 rounded-2xl overflow-hidden border border-border/50 max-w-full",
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
          authorId={authorId}
          subscriptionPriceKrw={subscriptionPriceKrw}
          paymentsEnabled={paymentsEnabled}
          subscribed={subscribed}
          postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
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
  authorId,
  subscriptionPriceKrw,
  paymentsEnabled,
  subscribed,
  postInstantPurchasePriceKrw,
}: {
  media: ProfilePostMediaItem;
  postId: string;
  authorUsername: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  paymentsEnabled: boolean;
  subscribed?: boolean;
  postInstantPurchasePriceKrw?: number;
}) {
  const locked = !!media.locked && !!media.id;
  const lockReason = media.lockReason ?? "none";
  const purchasePrice = media.instantPurchasePriceKrw ?? media.priceKrw ?? 0;

  return (
    <div className="relative aspect-square bg-muted/30 overflow-hidden">
      <ProtectedPaidMedia
        type={media.type}
        src={media.url}
        className={cn("w-full h-full object-cover", locked && "blur-xl scale-105")}
        mediaPriceKrw={media.priceKrw}
        postInstantPurchasePriceKrw={postInstantPurchasePriceKrw ?? media.instantPurchasePriceKrw}
        locked={locked}
      />

      {locked && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25"
          onClick={(e) => e.preventDefault()}
        >
          <div
            className="flex flex-col items-center gap-2 px-2"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white ring-2 ring-white/30">
              <Lock className="h-5 w-5" />
            </div>

            {lockReason === "subscription" && authorId && subscriptionPriceKrw ? (
              <>
                <p className="text-xs text-white text-center font-medium">구독자 전용</p>
                <SubscribeCreatorButton
                  creatorId={authorId}
                  username={authorUsername}
                  priceKrw={subscriptionPriceKrw}
                  paymentsEnabled={paymentsEnabled}
                  subscribed={subscribed}
                  compact
                />
                <SubscribeCreatorHint priceKrw={subscriptionPriceKrw} />
              </>
            ) : lockReason === "purchase" && purchasePrice > 0 ? (
              <PurchasePostMediaButton
                mediaId={media.id}
                priceKrw={purchasePrice}
                paymentsEnabled={paymentsEnabled}
                username={authorUsername}
                postId={postId}
                label={purchasePrice >= 10_000 ? "즉시 구매" : "유료 미디어"}
              />
            ) : (
              <p className="text-xs text-white/90 text-center">열람 권한이 없습니다.</p>
            )}
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
