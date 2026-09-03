"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { PaidFeedMediaSurface } from "@/components/media/paid-feed-media-surface";
import { PaidContentProtectionSlide } from "@/components/media/paid-content-protection-slide";
import { SensitiveContentGate } from "@/components/media/sensitive-content-gate";
import { AdultContentBadge } from "@/components/media/adult-content-badge";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import type { ContentLockReason } from "@/lib/content-access";
import {
  getCachedPostMedia,
  invalidatePostMediaCache,
  prefetchPostMedia,
  setCachedPostMedia,
} from "@/lib/post-media-client-cache";
import { useFeedVideoViewerOptional } from "@/components/feed/feed-video-viewer-provider";
import { useFeedPhotoLightboxOptional } from "@/components/media/feed-photo-lightbox-provider";
import { shouldBlockFeedVideoImmersive } from "@/components/media/feed-video-player";
import { postMediaAspectRatio } from "@/lib/format-feed";
import {
  isProtectionWarningSlide,
  withProtectionSlide,
} from "@/lib/paid-content-protection-slide";

const SLIDE_WIDTH_RATIO = 0.88;
const EDGE_PAD_RATIO = 0.06;

type Props = {
  media: ProfilePostMediaItem[];
  postId: string;
  authorUsername: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  paymentsEnabled?: boolean;
  subscribed?: boolean;
  postInstantPurchasePriceKrw?: number;
  mediaTotal?: number;
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
  /** 피드·검색: 썸네일 노출 + 성인 마크 (블러 없음) */
  feedPreview?: boolean;
  className?: string;
  onDoubleTapLike?: () => void;
};

function isVisual(m: ProfilePostMediaItem): boolean {
  if (m.type !== "IMAGE" && m.type !== "VIDEO") return false;
  return Boolean(m.url?.trim()) || Boolean(m.locked);
}

function formatDuration(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MediaOpenWrapper({
  media,
  index,
  postId,
  locked,
  onOpenAt,
  feedVideoViewer,
  children,
}: {
  media: ProfilePostMediaItem;
  index: number;
  postId: string;
  locked: boolean;
  onOpenAt: (index: number, locked?: boolean) => void;
  feedVideoViewer: ReturnType<typeof useFeedVideoViewerOptional>;
  children: ReactNode;
}) {
  return (
    <div
      role={!locked ? "button" : undefined}
      tabIndex={!locked ? 0 : undefined}
      className={cn("h-full w-full", !locked && "cursor-pointer")}
      onClickCapture={(e) => {
        if (locked) return;
        const sale = (media.priceKrw ?? media.instantPurchasePriceKrw ?? 0) > 0;
        if (sale) return;
        if (media.type !== "VIDEO" || !feedVideoViewer) return;
        if (shouldBlockFeedVideoImmersive(e)) return;
        e.preventDefault();
        e.stopPropagation();
        const opened = feedVideoViewer.openVideoViewer({
          postId,
          mediaId: media.id,
          mediaIndex: index,
        });
        if (!opened) onOpenAt(index, locked);
      }}
      onClick={(e) => {
        const sale = (media.priceKrw ?? media.instantPurchasePriceKrw ?? 0) > 0;
        if (sale) return;
        if (media.type === "VIDEO" && feedVideoViewer && shouldBlockFeedVideoImmersive(e)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (media.type === "VIDEO" && feedVideoViewer) return;
        onOpenAt(index, locked);
      }}
      onKeyDown={(e) => {
        if (locked) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onOpenAt(index, locked);
        }
      }}
    >
      {children}
    </div>
  );
}

function CarouselTile({
  media,
  postId,
  authorUsername,
  authorId,
  subscriptionPriceKrw,
  paymentsEnabled = false,
  subscribed = false,
  postInstantPurchasePriceKrw,
  active: _active,
  onDoubleTapLike: _onDoubleTapLike,
  onOpenFull,
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
  feedPreview = true,
  onPurchaseSuccess,
}: {
  media: ProfilePostMediaItem;
  postId: string;
  authorUsername: string;
  authorId?: string;
  subscriptionPriceKrw?: number;
  paymentsEnabled?: boolean;
  subscribed?: boolean;
  postInstantPurchasePriceKrw?: number;
  active: boolean;
  onDoubleTapLike?: () => void;
  onOpenFull?: () => void;
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
  feedPreview?: boolean;
  onPurchaseSuccess?: (mediaId?: string) => void | Promise<void>;
}) {
  const locked = !!media.locked && !!media.id;
  const lockReason = (media.lockReason ?? "none") as ContentLockReason;
  const durationLabel = media.type === "VIDEO" ? formatDuration(media.duration) : null;

  if (isProtectionWarningSlide(media)) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#0b1a4a]">
        <PaidContentProtectionSlide className="rounded-2xl" />
      </div>
    );
  }

  const mediaSurface = (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted/30">
      <PaidFeedMediaSurface
        type={media.type}
        src={media.url}
        className="h-full w-full object-cover"
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
        onPurchaseSuccess={onPurchaseSuccess}
        onOpenFull={onOpenFull}
        isOwner={isOwner}
      />

      {isNsfw && feedPreview ? <AdultContentBadge /> : null}

      {durationLabel && !locked ? (
        <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {durationLabel}
        </span>
      ) : null}
    </div>
  );

  if (feedPreview) {
    return mediaSurface;
  }

  return (
    <SensitiveContentGate
      isNsfw={isNsfw}
      isOwner={isOwner}
      viewerShowNsfw={viewerShowNsfw}
      className="h-full w-full"
    >
      {mediaSurface}
    </SensitiveContentGate>
  );
}

export function FeedPostMediaCarousel({
  media,
  postId,
  authorUsername,
  authorId,
  subscriptionPriceKrw,
  paymentsEnabled = false,
  subscribed = false,
  postInstantPurchasePriceKrw,
  mediaTotal,
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
  feedPreview = true,
  className,
  onDoubleTapLike,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [localMedia, setLocalMedia] = useState(media);
  const [opening, setOpening] = useState(false);
  const feedVideoViewer = useFeedVideoViewerOptional();
  const photoLightbox = useFeedPhotoLightboxOptional();

  useEffect(() => {
    setLocalMedia(media);
  }, [media]);

  const refreshAfterPurchase = useCallback(
    async (purchasedMediaId?: string) => {
      const unlock = (items: ProfilePostMediaItem[]) =>
        items.map((m) => {
          if (!m.id) return m;
          const isInstant = postInstantPurchasePriceKrw && postInstantPurchasePriceKrw > 0;
          const shouldUnlock =
            isInstant || m.id === purchasedMediaId || (!purchasedMediaId && (m.priceKrw ?? 0) > 0);
          if (!shouldUnlock) return m;
          return {
            ...m,
            locked: false,
            lockReason: "none" as const,
            url: m.id ? `/api/media/paid/${encodeURIComponent(m.id)}` : m.url,
          };
        });

      setLocalMedia((prev) => {
        const next = unlock(prev);
        photoLightbox?.updatePhotoLightboxMedia(next.filter(isVisual));
        return next;
      });

      invalidatePostMediaCache(postId);
      const fresh = await prefetchPostMedia(postId, { force: true });
      if (fresh?.length) {
        const resolved = fresh as ProfilePostMediaItem[];
        setLocalMedia(resolved);
        photoLightbox?.updatePhotoLightboxMedia(resolved.filter(isVisual));
        setCachedPostMedia(postId, fresh);
      }
    },
    [photoLightbox, postId, postInstantPurchasePriceKrw, isOwner]
  );

  const total = mediaTotal ?? localMedia.length;
  const needsFullFetch = total > localMedia.length;

  useEffect(() => {
    if (!needsFullFetch && localMedia.length > 0) {
      setCachedPostMedia(postId, localMedia);
      return;
    }
    if (needsFullFetch) {
      void prefetchPostMedia(postId);
    }
  }, [needsFullFetch, localMedia, postId]);

  const openLightbox = useCallback(
    (resolved: ProfilePostMediaItem[], index: number) => {
      photoLightbox?.openPhotoLightbox({
        media: resolved,
        index,
        postId,
        postInstantPurchasePriceKrw,
        isOwner,
      });
    },
    [photoLightbox, postId, postInstantPurchasePriceKrw, isOwner]
  );

  const rawVisual = useMemo(() => localMedia.filter(isVisual), [localMedia]);
  const items = useMemo(
    () =>
      withProtectionSlide(rawVisual, {
        postInstantPurchasePriceKrw,
        isOwner,
      }),
    [rawVisual, postInstantPurchasePriceKrw, isOwner]
  );
  const multi = items.length > 1;

  function warmFullMedia() {
    if (!needsFullFetch) return;
    void prefetchPostMedia(postId);
  }

  async function openAt(index: number, locked?: boolean) {
    if (locked || opening) return;

    const tapped = items[index];
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

    if (items.length >= total) {
      openLightbox(rawVisual, index);
      return;
    }

    setOpening(true);
    try {
      const cached = getCachedPostMedia(postId);
      const full =
        cached && cached.length >= total
          ? cached
          : (await prefetchPostMedia(postId)) ?? cached ?? items;
      if (full.length > 0) setCachedPostMedia(postId, full);
      const resolved = (full.length >= items.length ? full : items) as ProfilePostMediaItem[];
      openLightbox(resolved.filter(isVisual), index);
    } finally {
      setOpening(false);
    }
  }

  const syncFromScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root || items.length === 0) return;
    const slides = root.querySelectorAll<HTMLElement>("[data-feed-carousel-slide]");
    const mid = root.scrollLeft + root.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((el, i) => {
      const center = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActiveIndex(best);
  }, [items.length]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !multi) return;
    root.addEventListener("scroll", syncFromScroll, { passive: true });
    return () => root.removeEventListener("scroll", syncFromScroll);
  }, [multi, syncFromScroll]);

  if (items.length === 0) return null;

  const renderTile = (m: ProfilePostMediaItem, i: number, active: boolean) => {
    const locked = !!m.locked && !!m.id;
    return (
      <MediaOpenWrapper
        media={m}
        index={i}
        postId={postId}
        locked={locked}
        onOpenAt={openAt}
        feedVideoViewer={feedVideoViewer}
      >
        <CarouselTile
          media={m}
          postId={postId}
          authorUsername={authorUsername}
          authorId={authorId}
          subscriptionPriceKrw={subscriptionPriceKrw}
          paymentsEnabled={paymentsEnabled}
          subscribed={subscribed}
          postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
          active={active}
          onDoubleTapLike={onDoubleTapLike}
          onOpenFull={() => void openAt(i, false)}
          isNsfw={isNsfw}
          isOwner={isOwner}
          viewerShowNsfw={viewerShowNsfw}
          feedPreview={feedPreview}
          onPurchaseSuccess={(id) => void refreshAfterPurchase(id)}
        />
      </MediaOpenWrapper>
    );
  };

  if (!multi) {
    const m = items[0]!;
    const aspect = postMediaAspectRatio(m);
    return (
      <div
        className={cn("mt-3 max-w-full", className, opening && "opacity-80")}
        onPointerEnter={warmFullMedia}
        onFocusCapture={warmFullMedia}
      >
        <div
          className="overflow-hidden rounded-2xl border border-border/50 bg-muted/20"
          style={{ aspectRatio: aspect, maxHeight: 510 }}
        >
          {renderTile(m, 0, true)}
        </div>
      </div>
    );
  }

  const padStyle = {
    paddingLeft: `max(${EDGE_PAD_RATIO * 100}%, 0.75rem)`,
    paddingRight: `max(${EDGE_PAD_RATIO * 100}%, 0.75rem)`,
  } satisfies CSSProperties;

  return (
    <div
      className={cn("mt-3 max-w-full", className, opening && "opacity-80")}
      onPointerEnter={warmFullMedia}
      onFocusCapture={warmFullMedia}
    >
        <div className="mb-2 flex items-center justify-center gap-1.5" aria-hidden>
          {items.map((item, i) => (
            <span
              key={item.id ?? `${postId}:${i}`}
              className={cn(
                "rounded-full transition-all",
                i === activeIndex
                  ? "h-1.5 w-1.5 bg-primary"
                  : "h-1.5 w-1.5 bg-muted-foreground/35"
              )}
            />
          ))}
        </div>

        <div
          ref={scrollerRef}
          className={cn(
            "flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
          style={padStyle}
          role="list"
          aria-label="게시물 미디어"
        >
          {items.map((m, i) => {
            const aspect = postMediaAspectRatio(m);
            return (
              <div
                key={m.id ?? `${postId}:${i}`}
                data-feed-carousel-slide={i}
                role="listitem"
                className="snap-center shrink-0"
                style={{
                  width: `${SLIDE_WIDTH_RATIO * 100}%`,
                  aspectRatio: aspect,
                  maxHeight: 510,
                }}
              >
                {renderTile(m, i, i === activeIndex)}
              </div>
            );
          })}
        </div>
    </div>
  );
}
