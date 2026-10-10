"use client";

import { useCallback, useEffect, useState, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { PaidFeedMediaSurface } from "@/components/media/paid-feed-media-surface";
import { SensitiveContentGate } from "@/components/media/sensitive-content-gate";
import { useFeedPhotoLightboxOptional } from "@/components/media/feed-photo-lightbox-provider";
import type { ContentLockReason } from "@/lib/content-access";
import {
  getCachedPostMedia,
  prefetchPostMedia,
  setCachedPostMedia,
} from "@/lib/post-media-client-cache";
import { useFeedVideoViewerOptional } from "@/components/feed/feed-video-viewer-provider";
import { shouldBlockFeedVideoImmersive } from "@/components/media/feed-video-player";
import { feedMediaCompactFrameStyle } from "@/lib/format-feed";

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
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
  className,
  onDoubleTapLike: _onDoubleTapLike,
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
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
  className?: string;
  /** Double-tap video → like (feed / detail). */
  onDoubleTapLike?: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => new Set());
  const [intrinsic, setIntrinsic] = useState<Record<string, { width: number; height: number }>>({});
  const feedVideoViewer = useFeedVideoViewerOptional();
  const photoLightbox = useFeedPhotoLightboxOptional();

  function markPurchased(mediaId?: string) {
    setUnlockedIds((prev) => {
      const next = new Set(prev);
      const unlockAll = (postInstantPurchasePriceKrw ?? 0) > 0;
      if (unlockAll) {
        for (const item of media) {
          if (item.id) next.add(item.id);
        }
      } else if (mediaId) {
        next.add(mediaId);
      }
      return next;
    });
  }

  const total = mediaTotal ?? media.length;
  const needsFullFetch = total > media.length;

  useEffect(() => {
    if (!needsFullFetch && media.length > 0) {
      setCachedPostMedia(postId, media);
      return;
    }
    // 미리보기만 있는 게시글은 백그라운드에서 전체 목록 워밍
    if (needsFullFetch) {
      void prefetchPostMedia(postId);
    }
  }, [needsFullFetch, media, postId]);

  const withIntrinsic = useCallback(
    (m: ProfilePostMediaItem): ProfilePostMediaItem => {
      const hit = m.id ? intrinsic[m.id] : undefined;
      return hit ? { ...m, width: hit.width, height: hit.height } : m;
    },
    [intrinsic]
  );

  const rememberIntrinsic = useCallback((m: ProfilePostMediaItem, event: SyntheticEvent) => {
    const el = event.target;
    let width = 0;
    let height = 0;
    if (m.type === "VIDEO" && el instanceof HTMLVideoElement) {
      width = el.videoWidth;
      height = el.videoHeight;
    } else if (m.type === "IMAGE" && el instanceof HTMLImageElement) {
      width = el.naturalWidth;
      height = el.naturalHeight;
    } else {
      return;
    }
    if (!m.id || width <= 0 || height <= 0) return;
    setIntrinsic((prev) => {
      const cur = prev[m.id!];
      if (cur?.width === width && cur.height === height) return prev;
      return { ...prev, [m.id!]: { width, height } };
    });
  }, []);

  if (media.length === 0) return null;

  const preview = media.slice(0, FEED_GRID_MAX);
  const count = preview.length;
  const overflow = Math.max(0, total - FEED_GRID_MAX);
  const singleFrame = count === 1 ? withIntrinsic(preview[0]!) : null;
  const singleAspectStyle = singleFrame ? feedMediaCompactFrameStyle(singleFrame) : undefined;

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
      photoLightbox?.openPhotoLightbox({
        media,
        index,
        postId,
        postInstantPurchasePriceKrw,
        isOwner,
      });
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
      const resolved = (full.length >= media.length ? full : media) as ProfilePostMediaItem[];
      photoLightbox?.openPhotoLightbox({
        media: resolved,
        index,
        postId,
        postInstantPurchasePriceKrw,
        isOwner,
      });
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <div
        className={cn("mt-3 max-w-full", className)}
        onPointerEnter={warmFullMedia}
        onFocusCapture={warmFullMedia}
      >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/50 max-w-full bg-border/60",
          count === 1 ? "mr-auto" : "aspect-[1.7/1]",
          opening && "opacity-80"
        )}
        style={singleAspectStyle}
        onLoadedMetadataCapture={
          singleFrame ? (event) => rememberIntrinsic(singleFrame, event) : undefined
        }
        onLoadCapture={
          singleFrame ? (event) => rememberIntrinsic(singleFrame, event) : undefined
        }
      >
        <div
          className={cn(
            "grid w-full gap-[2px]",
            count === 1 && "h-full grid-cols-1",
            count === 2 && "h-full grid-cols-2",
            count >= 3 && "h-full grid-cols-2 grid-rows-2"
          )}
        >
          {preview.map((m, i) => {
            const key = m.id ?? `${m.url}-${i}`;
            const locked = !!m.locked && !!m.id && !unlockedIds.has(m.id);
            const spanClass =
              count === 3 && i === 0 ? "row-span-2" : undefined;
            const showOverflow = i === FEED_GRID_MAX - 1 && overflow > 0;

            return (
              <div
                key={key}
                role={!locked && m.type !== "VIDEO" ? "button" : undefined}
                tabIndex={!locked && m.type !== "VIDEO" ? 0 : undefined}
                className={cn(
                  "relative min-h-0 overflow-hidden bg-muted/30 text-left",
                  count === 1 ? "h-full" : "h-full min-h-[120px]",
                  spanClass,
                  !locked && "cursor-pointer"
                )}
                // Capture BEFORE FeedVideoPlayer stopPropagation — otherwise
                // mobile taps only play/zoom the inline player and never open the viewer.
                onClickCapture={(e) => {
                  if (locked) return;
                  const sale = (m.priceKrw ?? m.instantPurchasePriceKrw ?? 0) > 0;
                  if (sale) return;
                  if (m.type === "VIDEO") return;
                  if (shouldBlockFeedVideoImmersive(e)) return;
                }}
                onClick={(e) => {
                  const sale = (m.priceKrw ?? m.instantPurchasePriceKrw ?? 0) > 0;
                  if (sale) return;
                  if (m.type === "VIDEO" && feedVideoViewer && shouldBlockFeedVideoImmersive(e)) {
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();
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
                  locked={locked}
                  postId={postId}
                  authorUsername={authorUsername}
                  authorId={authorId}
                  subscriptionPriceKrw={subscriptionPriceKrw}
                  paymentsEnabled={paymentsEnabled}
                  subscribed={subscribed}
                  postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
                  isNsfw={isNsfw}
                  isOwner={isOwner}
                  viewerShowNsfw={viewerShowNsfw}
                  contain={count === 1}
                  onOpenFull={() => void openAt(i, false)}
                  onPurchaseSuccess={(id) => markPurchased(id)}
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
      </div>
    </>
  );
}

function PaidPostMediaTile({
  media,
  locked,
  postId,
  authorUsername,
  authorId,
  subscriptionPriceKrw,
  paymentsEnabled,
  subscribed,
  postInstantPurchasePriceKrw,
  contain = false,
  onOpenFull,
  onPurchaseSuccess,
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
}: {
  media: ProfilePostMediaItem;
  locked: boolean;
  postId: string;
  authorUsername: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  paymentsEnabled: boolean;
  subscribed?: boolean;
  postInstantPurchasePriceKrw?: number;
  contain?: boolean;
  onOpenFull?: () => void;
  onPurchaseSuccess?: (mediaId?: string) => void | Promise<void>;
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
}) {
  const lockReason = media.lockReason ?? "none";

  return (
    <SensitiveContentGate
      isNsfw={isNsfw}
      isOwner={isOwner}
      viewerShowNsfw={viewerShowNsfw}
      className="relative h-full w-full overflow-hidden"
    >
      <div className="relative h-full w-full overflow-hidden">
      <PaidFeedMediaSurface
        type={media.type}
        src={media.url}
        className={cn("h-full w-full", contain ? "object-contain" : "object-cover")}
        mediaPriceKrw={media.priceKrw}
        postInstantPurchasePriceKrw={postInstantPurchasePriceKrw ?? media.instantPurchasePriceKrw}
        locked={locked}
        lockReason={lockReason}
        mediaId={media.id}
        poster={media.posterUrl ?? undefined}
        postId={postId}
        authorUsername={authorUsername}
        authorId={authorId}
        subscriptionPriceKrw={subscriptionPriceKrw}
        subscribed={subscribed}
        paymentsEnabled={paymentsEnabled}
        onOpenFull={onOpenFull}
        onPurchaseSuccess={onPurchaseSuccess}
        isOwner={isOwner}
      />
      </div>
    </SensitiveContentGate>
  );
}
