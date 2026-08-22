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
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import { LockedMediaPaywallOverlay } from "@/components/media/locked-media-paywall-overlay";
import { SensitiveContentGate } from "@/components/media/sensitive-content-gate";
import { PurchasePostMediaButton } from "@/components/profile/purchase-post-media-button";
import {
  SubscribeCreatorButton,
  SubscribeCreatorHint,
} from "@/components/monetization/subscribe-creator-button";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import type { ContentLockReason } from "@/lib/content-access";
import { PostMediaLightbox } from "@/components/media/post-media-lightbox";
import {
  getCachedPostMedia,
  invalidatePostMediaCache,
  prefetchPostMedia,
  setCachedPostMedia,
} from "@/lib/post-media-client-cache";
import { useFeedVideoViewerOptional } from "@/components/feed/feed-video-viewer-provider";
import { shouldBlockFeedVideoImmersive } from "@/components/media/feed-video-player";

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
  active,
  onDoubleTapLike,
  onOpenImmersive,
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
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
  onOpenImmersive?: () => void;
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
  onPurchaseSuccess?: (mediaId?: string) => void | Promise<void>;
}) {
  const locked = !!media.locked && !!media.id;
  const lockReason = (media.lockReason ?? "none") as ContentLockReason;
  const purchasePrice = media.instantPurchasePriceKrw ?? media.priceKrw ?? 0;
  const durationLabel = media.type === "VIDEO" ? formatDuration(media.duration) : null;

  return (
    <SensitiveContentGate
      isNsfw={isNsfw}
      isOwner={isOwner}
      viewerShowNsfw={viewerShowNsfw}
      className="h-full w-full"
    >
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted/30">
      <ProtectedPaidMedia
        type={media.type}
        src={media.url}
        className={cn("h-full w-full object-cover", locked && "blur-sm scale-105")}
        mediaPriceKrw={media.priceKrw}
        postInstantPurchasePriceKrw={postInstantPurchasePriceKrw ?? media.instantPurchasePriceKrw}
        locked={locked}
        mediaId={media.id}
        autoPlayOnView={active}
        onDoubleTapLike={onDoubleTapLike}
        onOpenImmersive={onOpenImmersive}
        poster={media.posterUrl ?? undefined}
      />

      {locked && (
        <div className="absolute inset-0" onClick={(e) => e.stopPropagation()}>
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
                mediaId={media.id!}
                priceKrw={purchasePrice}
                paymentsEnabled={paymentsEnabled}
                username={authorUsername}
                postId={postId}
                label="결제하기"
                variant="label"
                onPurchaseSuccess={() => onPurchaseSuccess?.(media.id!)}
              />
            </LockedMediaPaywallOverlay>
          ) : (
            <LockedMediaPaywallOverlay label="열람 권한이 없습니다." />
          )}
        </div>
      )}

      {durationLabel && !locked ? (
        <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {durationLabel}
        </span>
      ) : null}
      </div>
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
  className,
  onDoubleTapLike,
}: Props) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [localMedia, setLocalMedia] = useState(media);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<ProfilePostMediaItem[]>(media);
  const [opening, setOpening] = useState(false);
  const feedVideoViewer = useFeedVideoViewerOptional();

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
          return { ...m, locked: false, lockReason: "none" as const };
        });

      setLocalMedia((prev) => unlock(prev));
      setLightboxMedia((prev) => unlock(prev));

      invalidatePostMediaCache(postId);
      const fresh = await prefetchPostMedia(postId, { force: true });
      if (fresh?.length) {
        const resolved = fresh as ProfilePostMediaItem[];
        setLocalMedia(resolved);
        setLightboxMedia(resolved.filter(isVisual));
        setCachedPostMedia(postId, fresh);
      }
      router.refresh();
    },
    [postId, postInstantPurchasePriceKrw, router]
  );

  const total = mediaTotal ?? localMedia.length;
  const needsFullFetch = total > localMedia.length;

  useEffect(() => {
    if (!needsFullFetch && localMedia.length > 0) {
      setCachedPostMedia(postId, localMedia);
      setLightboxMedia(localMedia);
      return;
    }
    if (needsFullFetch) {
      void prefetchPostMedia(postId);
    }
  }, [needsFullFetch, localMedia, postId]);

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
      setLightboxMedia(items);
      setLightboxIndex(index);
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
      setLightboxMedia(resolved.filter(isVisual));
      setLightboxIndex(index);
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
          isNsfw={isNsfw}
          isOwner={isOwner}
          viewerShowNsfw={viewerShowNsfw}
          onPurchaseSuccess={(id) => void refreshAfterPurchase(id)}
        />
      </MediaOpenWrapper>
    );
  };

  const lightbox = lightboxIndex !== null && lightboxMedia.length > 0 && (
    <PostMediaLightbox
      open
      onClose={() => setLightboxIndex(null)}
      media={lightboxMedia}
      initialIndex={Math.min(lightboxIndex, lightboxMedia.length - 1)}
      postId={postId}
      postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
    />
  );

  if (!multi) {
    const m = items[0]!;
    const aspect =
      m.width && m.height && m.width > 0 && m.height > 0
        ? `${m.width} / ${m.height}`
        : "16 / 10";
    return (
      <>
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
        {lightbox}
      </>
    );
  }

  const padStyle = {
    paddingLeft: `max(${EDGE_PAD_RATIO * 100}%, 0.75rem)`,
    paddingRight: `max(${EDGE_PAD_RATIO * 100}%, 0.75rem)`,
  } satisfies CSSProperties;

  return (
    <>
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
            const aspect =
              m.width && m.height && m.width > 0 && m.height > 0
                ? `${m.width} / ${m.height}`
                : "16 / 10";
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
      {lightbox}
    </>
  );
}
