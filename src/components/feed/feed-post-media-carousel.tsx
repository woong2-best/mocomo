"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { cn } from "@/lib/utils";
import { PaidFeedMediaSurface } from "@/components/media/paid-feed-media-surface";
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
import { feedMediaFrameStyle, isPortraitMedia } from "@/lib/format-feed";
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
        // Let the inline player handle play / fullscreen. Opening the viewer
        // here steals the play tap and leaves the video paused.
        if (media.type === "VIDEO") return;
        if (shouldBlockFeedVideoImmersive(e)) return;
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

  const mediaSurface = (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted/30">
      <PaidFeedMediaSurface
        type={media.type}
        src={media.url}
        className={cn(
          "h-full w-full",
          isPortraitMedia(media) ? "object-contain" : "object-cover"
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
        onPurchaseSuccess={onPurchaseSuccess}
        onOpenFull={onOpenFull}
        isOwner={isOwner}
        feedPreview={feedPreview}
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
  const [intrinsic, setIntrinsic] = useState<Record<string, { width: number; height: number }>>({});
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

  const items = useMemo(() => localMedia.filter(isVisual), [localMedia]);
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
      openLightbox(items, index);
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
    if (!m.id || width <= 0 || height <= width) return;
    setIntrinsic((prev) => {
      const cur = prev[m.id!];
      if (cur?.width === width && cur.height === height) return prev;
      return { ...prev, [m.id!]: { width, height } };
    });
  }, []);

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
    return (
      <div
        className={cn("mt-3 max-w-full", className, opening && "opacity-80")}
        onPointerEnter={warmFullMedia}
        onFocusCapture={warmFullMedia}
      >
        <div className="w-full [container-type:inline-size]">
          <div
            className="mr-auto overflow-hidden rounded-2xl border border-border/50 bg-muted/20"
            style={feedMediaFrameStyle(withIntrinsic(m))}
            onLoadedMetadataCapture={(event) => rememberIntrinsic(m, event)}
            onLoadCapture={(event) => rememberIntrinsic(m, event)}
          >
            {renderTile(withIntrinsic(m), 0, true)}
          </div>
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
          aria-label={t("feed.svtcyuc")}
        >
          {items.map((m, i) => {
            return (
              <div
                key={m.id ?? `${postId}:${i}`}
                data-feed-carousel-slide={i}
                role="listitem"
                className="snap-center shrink-0"
                style={{ width: `${SLIDE_WIDTH_RATIO * 100}%` }}
              >
                <div className="w-full [container-type:inline-size]">
                  <div
                    className="mr-auto overflow-hidden rounded-2xl"
                    style={feedMediaFrameStyle(withIntrinsic(m))}
                    onLoadedMetadataCapture={(event) => rememberIntrinsic(m, event)}
                    onLoadCapture={(event) => rememberIntrinsic(m, event)}
                  >
                    {renderTile(withIntrinsic(m), i, i === activeIndex)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}
