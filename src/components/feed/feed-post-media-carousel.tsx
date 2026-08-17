"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
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
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
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
        className={cn("h-full w-full object-cover", locked && "blur-xl scale-105")}
        mediaPriceKrw={media.priceKrw}
        postInstantPurchasePriceKrw={postInstantPurchasePriceKrw ?? media.instantPurchasePriceKrw}
        locked={locked}
        mediaId={media.id}
        autoPlayOnView={active && !locked}
        onDoubleTapLike={onDoubleTapLike}
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
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
  className,
  onDoubleTapLike,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => media.filter(isVisual), [media]);
  const multi = items.length > 1;

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

  if (!multi) {
    const m = items[0]!;
    const aspect =
      m.width && m.height && m.width > 0 && m.height > 0
        ? `${m.width} / ${m.height}`
        : "16 / 10";
    return (
      <div className={cn("mt-3 max-w-full", className)}>
        <div
          className="overflow-hidden rounded-2xl border border-border/50 bg-muted/20"
          style={{ aspectRatio: aspect, maxHeight: 510 }}
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
            active
            onDoubleTapLike={onDoubleTapLike}
            isNsfw={isNsfw}
            isOwner={isOwner}
            viewerShowNsfw={viewerShowNsfw}
          />
        </div>
      </div>
    );
  }

  const padStyle = {
    paddingLeft: `max(${EDGE_PAD_RATIO * 100}%, 0.75rem)`,
    paddingRight: `max(${EDGE_PAD_RATIO * 100}%, 0.75rem)`,
  } satisfies CSSProperties;

  return (
    <div className={cn("mt-3 max-w-full", className)}>
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
              <CarouselTile
                media={m}
                postId={postId}
                authorUsername={authorUsername}
                authorId={authorId}
                subscriptionPriceKrw={subscriptionPriceKrw}
                paymentsEnabled={paymentsEnabled}
                subscribed={subscribed}
                postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
                active={i === activeIndex}
                onDoubleTapLike={onDoubleTapLike}
                isNsfw={isNsfw}
                isOwner={isOwner}
                viewerShowNsfw={viewerShowNsfw}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
