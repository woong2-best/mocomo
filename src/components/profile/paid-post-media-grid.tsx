"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PurchasePostMediaButton } from "@/components/profile/purchase-post-media-button";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import { LockedMediaPaywallOverlay } from "@/components/media/locked-media-paywall-overlay";
import { PostMediaLightbox } from "@/components/media/post-media-lightbox";
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

const FEED_GRID_MAX = 4;

export function PaidPostMediaGrid({
  media,
  postId,
  authorUsername,
  authorId,
  subscriptionPriceKrw,
  paymentsEnabled,
  subscribed = false,
  linkToPost: _linkToPost = true,
  postInstantPurchasePriceKrw,
  mediaTotal,
  className,
}: {
  media: ProfilePostMediaItem[];
  postId: string;
  authorUsername: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  paymentsEnabled: boolean;
  subscribed?: boolean;
  /** @deprecated 이미지 클릭은 라이트박스로 열립니다 */
  linkToPost?: boolean;
  postInstantPurchasePriceKrw?: number;
  /** 로드된 media보다 전체 개수가 많을 때 (라이트박스에서 추가 fetch) */
  mediaTotal?: number;
  className?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  const total = mediaTotal ?? media.length;
  const preview = media.slice(0, FEED_GRID_MAX);
  const count = preview.length;
  const overflow = Math.max(0, total - FEED_GRID_MAX);

  function openAt(index: number, locked?: boolean) {
    if (locked) return;
    setLightboxIndex(index);
  }

  return (
    <>
      <div
        className={cn(
          "mt-3 overflow-hidden rounded-2xl border border-border/50 max-w-full bg-border/60",
          count === 1 ? "max-h-[510px]" : "aspect-[1.7/1]",
          className
        )}
      >
        <div
          className={cn(
            "grid w-full gap-[2px]",
            count === 1 && "grid-cols-1",
            count === 2 && "h-full grid-cols-2",
            count >= 3 && "h-full grid-cols-2 grid-rows-2"
          )}
        >
          {preview.map((m, i) => {
            const key = m.id ?? `${m.url}-${i}`;
            const locked = !!m.locked && !!m.id;
            const spanClass =
              count === 3 && i === 0 ? "row-span-2" : undefined;
            const showOverflow = i === FEED_GRID_MAX - 1 && overflow > 0;

            return (
              <div
                key={key}
                role={!locked ? "button" : undefined}
                tabIndex={!locked ? 0 : undefined}
                className={cn(
                  "relative min-h-0 overflow-hidden bg-muted/30 text-left",
                  count === 1 ? "max-h-[510px]" : "h-full min-h-[120px]",
                  spanClass,
                  !locked && "cursor-pointer"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openAt(i, locked);
                }}
                onKeyDown={(e) => {
                  if (locked) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    openAt(i, locked);
                  }
                }}
              >
                <PaidPostMediaTile
                  media={m}
                  postId={postId}
                  authorUsername={authorUsername}
                  authorId={authorId}
                  subscriptionPriceKrw={subscriptionPriceKrw}
                  paymentsEnabled={paymentsEnabled}
                  subscribed={subscribed}
                  postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
                  single={count === 1}
                />
                {showOverflow && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-semibold text-white">
                    +{overflow}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {lightboxIndex !== null && (
        <PostMediaLightbox
          open
          onClose={() => setLightboxIndex(null)}
          media={media}
          initialIndex={lightboxIndex}
          postId={postId}
          mediaTotal={total}
          postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
        />
      )}
    </>
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
  single,
}: {
  media: ProfilePostMediaItem;
  postId: string;
  authorUsername: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  paymentsEnabled: boolean;
  subscribed?: boolean;
  postInstantPurchasePriceKrw?: number;
  single?: boolean;
}) {
  const locked = !!media.locked && !!media.id;
  const lockReason = media.lockReason ?? "none";
  const purchasePrice = media.instantPurchasePriceKrw ?? media.priceKrw ?? 0;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        single ? "max-h-[510px]" : "h-full"
      )}
    >
      <ProtectedPaidMedia
        type={media.type}
        src={media.url}
        className={cn(
          "w-full",
          single
            ? "max-h-[510px] h-auto object-contain bg-muted/20"
            : "h-full object-cover",
          locked && "blur-xl scale-105"
        )}
        mediaPriceKrw={media.priceKrw}
        postInstantPurchasePriceKrw={postInstantPurchasePriceKrw ?? media.instantPurchasePriceKrw}
        locked={locked}
      />

      {locked && (
        <div
          className="absolute inset-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {lockReason === "subscription" && authorId && subscriptionPriceKrw ? (
            <LockedMediaPaywallOverlay label="구독하기">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[13px] font-semibold text-white">구독하기</p>
                <SubscribeCreatorButton
                  creatorId={authorId}
                  username={authorUsername}
                  priceKrw={subscriptionPriceKrw}
                  paymentsEnabled={paymentsEnabled}
                  subscribed={subscribed}
                  compact
                />
                <SubscribeCreatorHint priceKrw={subscriptionPriceKrw} />
              </div>
            </LockedMediaPaywallOverlay>
          ) : lockReason === "purchase" && purchasePrice > 0 ? (
            <LockedMediaPaywallOverlay>
              <PurchasePostMediaButton
                mediaId={media.id}
                priceKrw={purchasePrice}
                paymentsEnabled={paymentsEnabled}
                username={authorUsername}
                postId={postId}
                label="결제하기"
                variant="label"
              />
            </LockedMediaPaywallOverlay>
          ) : (
            <LockedMediaPaywallOverlay label="열람 권한이 없습니다." />
          )}
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
