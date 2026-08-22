"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PaidFeedMediaSurface } from "@/components/media/paid-feed-media-surface";
import { SensitiveContentGate } from "@/components/media/sensitive-content-gate";
import { PostMediaLightbox } from "@/components/media/post-media-lightbox";
import type { ContentLockReason } from "@/lib/content-access";
import {
  getCachedPostMedia,
  prefetchPostMedia,
  setCachedPostMedia,
} from "@/lib/post-media-client-cache";
import { useFeedVideoViewerOptional } from "@/components/feed/feed-video-viewer-provider";
import { shouldBlockFeedVideoImmersive } from "@/components/media/feed-video-player";

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
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<ProfilePostMediaItem[]>(media);
  const [opening, setOpening] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => new Set());
  const feedVideoViewer = useFeedVideoViewerOptional();

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
    router.refresh();
  }

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
            const locked = !!m.locked && !!m.id && !unlockedIds.has(m.id);
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
                  const sale = (m.priceKrw ?? m.instantPurchasePriceKrw ?? 0) > 0;
                  if (sale) return;
                  if (m.type !== "VIDEO" || !feedVideoViewer) return;
                  if (shouldBlockFeedVideoImmersive(e)) return;
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
                  single={count === 1}
                  isNsfw={isNsfw}
                  isOwner={isOwner}
                  viewerShowNsfw={viewerShowNsfw}
                  onOpenFull={() => void openAt(i, locked)}
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
  locked,
  postId,
  authorUsername,
  authorId,
  subscriptionPriceKrw,
  paymentsEnabled,
  subscribed,
  postInstantPurchasePriceKrw,
  single,
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
  single?: boolean;
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
      className={cn("relative w-full overflow-hidden", single ? "max-h-[510px]" : "h-full")}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden",
          single ? "max-h-[510px]" : "h-full"
        )}
      >
      <PaidFeedMediaSurface
        type={media.type}
        src={media.url}
        className={cn(
          "w-full",
          single ? "max-h-[510px] h-full object-contain" : "h-full object-cover"
        )}
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
      />
      </div>
    </SensitiveContentGate>
  );
}
