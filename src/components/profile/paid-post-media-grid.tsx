"use client";

import { useEffect, useState } from "react";
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
import {
  getCachedPostMedia,
  prefetchPostMedia,
  setCachedPostMedia,
} from "@/lib/post-media-client-cache";
import { useFeedVideoViewerOptional } from "@/components/feed/feed-video-viewer-provider";
import { isFeedVideoControlTarget } from "@/components/media/feed-video-player";

export type ProfilePostMediaItem = {
  id?: string;
  url: string;
  type: string;
  priceKrw?: number;
  instantPurchasePriceKrw?: number;
  locked?: boolean;
  lockReason?: ContentLockReason;
  hlsUrl?: string | null;
  posterUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
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
  onDoubleTapLike,
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
  /** Double-tap video → like (feed / detail). */
  onDoubleTapLike?: () => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<ProfilePostMediaItem[]>(media);
  const [opening, setOpening] = useState(false);
  const feedVideoViewer = useFeedVideoViewerOptional();

  const total = mediaTotal ?? media.length;
  const needsFullFetch = total > media.length;

  useEffect(() => {
    if (!needsFullFetch && media.length > 0) {
      setCachedPostMedia(postId, media);
      setLightboxMedia(media);
      return;
    }
    // 미리보기만 있는 게시글은 백그라운드에서 전체 목록 워밍
    if (needsFullFetch) {
      void prefetchPostMedia(postId);
    }
  }, [needsFullFetch, media, postId]);

  if (media.length === 0) return null;

  const preview = media.slice(0, FEED_GRID_MAX);
  const count = preview.length;
  const overflow = Math.max(0, total - FEED_GRID_MAX);

  function warmFullMedia() {
    if (!needsFullFetch) return;
    void prefetchPostMedia(postId);
  }

  async function openAt(index: number, locked?: boolean) {
    if (locked || opening) return;

    const tapped = media[index];
    // Feed VIDEO → immersive vertical viewer (X-style swipe / up-down). Images keep lightbox.
    if (
      tapped?.type === "VIDEO" &&
      feedVideoViewer &&
      feedVideoViewer.openVideoViewer({
        postId,
        mediaId: tapped.id,
        mediaIndex: index,
      })
    ) {
      return;
    }

    // 피드에 전체가 있으면 즉시 오픈. 잘려 있으면 fetch 끝난 뒤에만 오픈 (4장 깜빡임 제거)
    if (media.length >= total) {
      setLightboxMedia(media);
      setLightboxIndex(index);
      return;
    }

    setOpening(true);
    try {
      const cached = getCachedPostMedia(postId);
      const full =
        cached && cached.length >= total
          ? cached
          : (await prefetchPostMedia(postId)) ?? cached ?? media;
      if (full.length > 0) setCachedPostMedia(postId, full);
      setLightboxMedia((full.length >= media.length ? full : media) as ProfilePostMediaItem[]);
      setLightboxIndex(index);
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "mt-3 overflow-hidden rounded-2xl border border-border/50 max-w-full bg-border/60",
          count === 1 ? "max-h-[510px]" : "aspect-[1.7/1]",
          className,
          opening && "opacity-80"
        )}
        onPointerEnter={warmFullMedia}
        onFocusCapture={warmFullMedia}
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
                // Capture BEFORE FeedVideoPlayer stopPropagation — otherwise
                // mobile taps only play/zoom the inline player and never open the viewer.
                onClickCapture={(e) => {
                  if (locked) return;
                  if (m.type !== "VIDEO" || !feedVideoViewer) return;
                  if (isFeedVideoControlTarget(e.target)) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const opened = feedVideoViewer.openVideoViewer({
                    postId,
                    mediaId: m.id,
                    mediaIndex: i,
                  });
                  if (!opened) void openAt(i, locked);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // VIDEO + viewer already handled in capture.
                  if (m.type === "VIDEO" && feedVideoViewer) return;
                  void openAt(i, locked);
                }}
                onKeyDown={(e) => {
                  if (locked) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    void openAt(i, locked);
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
                  onDoubleTapLike={onDoubleTapLike}
                  onOpenImmersive={
                    !locked && m.type === "VIDEO" && feedVideoViewer
                      ? () => {
                          const opened = feedVideoViewer.openVideoViewer({
                            postId,
                            mediaId: m.id,
                            mediaIndex: i,
                          });
                          if (!opened) void openAt(i, locked);
                        }
                      : undefined
                  }
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

      {lightboxIndex !== null && lightboxMedia.length > 0 && (
        <PostMediaLightbox
          open
          onClose={() => setLightboxIndex(null)}
          media={lightboxMedia}
          initialIndex={Math.min(lightboxIndex, lightboxMedia.length - 1)}
          postId={postId}
          mediaTotal={lightboxMedia.length}
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
  onDoubleTapLike,
  onOpenImmersive,
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
  onDoubleTapLike?: () => void;
  onOpenImmersive?: () => void;
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
        mediaId={media.id}
        autoPlayOnView={!locked}
        onDoubleTapLike={onDoubleTapLike}
        onOpenImmersive={onOpenImmersive}
        poster={media.posterUrl ?? undefined}
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
