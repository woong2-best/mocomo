"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";
import { userDisplayName } from "@/lib/user-public-select";
import type { ReelItem } from "@/lib/reels/types";
import type { FeedVideoGroup } from "@/lib/feed-video-viewer";
import { ReelsPlayer } from "@/components/reels/reels-player";
import { ReelsActions } from "@/components/reels/reels-actions";
import { cn } from "@/lib/utils";

/** Desktop phone-frame width (px) — keep in sync with lg:w-[420px] */
const DESKTOP_CARD_PX = 420;

type Props = {
  group: FeedVideoGroup;
  index: number;
  activeIndex: number;
  initialVideoIndex?: number;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onOpenMenu: (x: number, y: number) => void;
  onShare: (reel: ReelItem) => void;
  disableLoop?: boolean;
  onEnded?: () => void;
  authCallbackPath?: string;
  onBackgroundClick?: () => void;
  onExpand: (videoIndex: number) => void;
  onActiveVideoChange?: (videoIndex: number) => void;
  forcedVideoIndex?: number | null;
  horizontalNavEnabled?: boolean;
  onComment?: (postId: string, commentCount: number) => void;
  commentCountOverride?: number;
};

export function FeedVideoPostSlide({
  group,
  index,
  activeIndex,
  initialVideoIndex = 0,
  muted,
  onMutedChange,
  onOpenMenu,
  onShare,
  disableLoop = false,
  onEnded,
  authCallbackPath,
  onBackgroundClick,
  onExpand,
  onActiveVideoChange,
  forcedVideoIndex = null,
  horizontalNavEnabled = true,
  onComment,
  commentCountOverride,
}: Props) {
  const hScrollerRef = useRef<HTMLDivElement>(null);
  const [videoIndex, setVideoIndex] = useState(() =>
    Math.max(0, Math.min(initialVideoIndex, group.videos.length - 1))
  );
  const [animating, setAnimating] = useState(false);
  const startedRef = useRef(false);
  const animTimerRef = useRef<number | null>(null);
  const distance = Math.abs(index - activeIndex);
  const isActive = index === activeIndex;
  const activeReel = group.videos[videoIndex] ?? group.videos[0]!;
  const like = useOptimisticLike(activeReel.postId, activeReel.liked, activeReel.likeCount);
  const star = useOptimisticStar(activeReel.postId, activeReel.starred);
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const router = useRouter();
  const multiVideo = group.videos.length > 1;
  const canHPrev = videoIndex > 0;
  const canHNext = videoIndex < group.videos.length - 1;
  const showSideNav = isActive && multiVideo && horizontalNavEnabled;

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    const callback = authCallbackPath ?? `/feed`;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
    return false;
  }

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior) => {
    const el = hScrollerRef.current?.querySelector<HTMLElement>(
      `[data-feed-video-h="${idx}"]`
    );
    el?.scrollIntoView({
      behavior,
      inline: "center",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const idx = Math.max(0, Math.min(initialVideoIndex, group.videos.length - 1));
    setVideoIndex(idx);
    requestAnimationFrame(() => {
      scrollToIndex(idx, "instant" as ScrollBehavior);
    });
  }, [initialVideoIndex, group.videos.length, scrollToIndex]);

  const syncFromScroll = useCallback(() => {
    const root = hScrollerRef.current;
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>("[data-feed-video-h]");
    const mid = root.scrollLeft + root.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((el) => {
      const idx = Number(el.dataset.feedVideoH);
      if (!Number.isFinite(idx)) return;
      const center = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    setVideoIndex((prev) => {
      if (prev === best) return prev;
      onActiveVideoChange?.(best);
      return best;
    });
  }, [onActiveVideoChange]);

  useEffect(() => {
    const root = hScrollerRef.current;
    if (!root) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncFromScroll);
    };
    const onScrollEnd = () => {
      setAnimating(false);
      syncFromScroll();
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("scrollend", onScrollEnd as EventListener);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("scrollend", onScrollEnd as EventListener);
    };
  }, [syncFromScroll, group.videos.length]);

  const goH = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(group.videos.length - 1, next));
      if (clamped === videoIndex && !animating) {
        scrollToIndex(clamped, "smooth");
        return;
      }
      setAnimating(true);
      if (animTimerRef.current) window.clearTimeout(animTimerRef.current);
      animTimerRef.current = window.setTimeout(() => {
        setAnimating(false);
        animTimerRef.current = null;
      }, 520);
      setVideoIndex(clamped);
      onActiveVideoChange?.(clamped);
      // Double rAF so scale/opacity classes apply before smooth scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToIndex(clamped, "smooth"));
      });
    },
    [animating, group.videos.length, onActiveVideoChange, scrollToIndex, videoIndex]
  );

  useEffect(() => {
    return () => {
      if (animTimerRef.current) window.clearTimeout(animTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (forcedVideoIndex == null) return;
    goH(forcedVideoIndex);
  }, [forcedVideoIndex, goH]);

  useEffect(() => {
    if (!isActive || !multiVideo || !horizontalNavEnabled) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goH(videoIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goH(videoIndex + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goH, horizontalNavEnabled, isActive, multiVideo, videoIndex]);

  // Recenter on resize so peeks stay balanced
  useEffect(() => {
    if (!multiVideo) return;
    const onResize = () => scrollToIndex(videoIndex, "instant" as ScrollBehavior);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [multiVideo, scrollToIndex, videoIndex]);

  const handleEnded = useCallback(() => {
    if (videoIndex < group.videos.length - 1) {
      goH(videoIndex + 1);
      return;
    }
    onEnded?.();
  }, [goH, group.videos.length, onEnded, videoIndex]);

  const caption =
    activeReel.title?.trim() ||
    activeReel.content.trim().slice(0, 160) ||
    `@${activeReel.author.username}`;

  const sideNavBtnClass = cn(
    "pointer-events-auto absolute top-1/2 z-40 hidden -translate-y-1/2",
    "h-11 w-11 items-center justify-center rounded-full",
    "border border-white/15 bg-white/20 text-white shadow-lg backdrop-blur-md transition",
    "hover:bg-white/35 hover:scale-105 active:scale-95",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
    "disabled:pointer-events-none disabled:opacity-30",
    "lg:flex"
  );

  // Place arrows just outside the centered 420px card
  const arrowOffset = `calc(50% - ${DESKTOP_CARD_PX / 2}px - 3.25rem)`;

  return (
    <section
      data-reel-index={index}
      data-reel-id={group.postId}
      className="relative flex h-[100dvh] w-full shrink-0 snap-start snap-always items-center justify-center overflow-hidden bg-black"
      aria-label={`Videos by ${userDisplayName(activeReel.author)}`}
      onClick={
        onBackgroundClick
          ? (e) => {
              if (e.target === e.currentTarget) onBackgroundClick();
            }
          : undefined
      }
    >
      <div
        className="relative h-full w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={hScrollerRef}
          className={cn(
            "flex h-full w-full overflow-x-auto overflow-y-hidden overscroll-x-contain",
            "snap-x snap-mandatory",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            // Desktop multi: peek neighbors with centered snap
            multiVideo
              ? cn(
                  "lg:items-center lg:gap-5",
                  // pad so first/last can sit in the center with peeks
                  "lg:px-[max(1rem,calc(50%-13.125rem))]"
                )
              : "lg:items-center lg:justify-center"
          )}
          style={
            multiVideo
              ? {
                  scrollBehavior: animating ? "smooth" : undefined,
                }
              : undefined
          }
          role="list"
          aria-label="같은 게시물 영상"
        >
          {group.videos.map((reel, vi) => {
            const d = isActive ? Math.abs(vi - videoIndex) : distance + 1;
            const isCurrent = vi === videoIndex;
            return (
              <div
                key={reel.id}
                data-feed-video-h={vi}
                role="listitem"
                className={cn(
                  "relative shrink-0 snap-center bg-black",
                  // Mobile: full-bleed page
                  "h-full w-full",
                  // Desktop card
                  multiVideo
                    ? cn(
                        "lg:h-[min(100dvh,920px)] lg:w-[420px] lg:overflow-hidden lg:rounded-2xl",
                        "lg:origin-center lg:transition-[transform,opacity,box-shadow] lg:duration-500",
                        "lg:ease-[cubic-bezier(0.22,1,0.36,1)]",
                        isCurrent
                          ? "lg:z-10 lg:scale-100 lg:opacity-100 lg:shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
                          : "lg:z-0 lg:scale-[0.78] lg:opacity-45 lg:cursor-pointer hover:lg:opacity-60"
                      )
                    : "lg:h-[min(100dvh,920px)] lg:w-[420px] lg:overflow-hidden lg:rounded-2xl"
                )}
                onClick={() => {
                  if (!multiVideo || isCurrent || !isActive) return;
                  goH(vi);
                }}
              >
                <ReelsPlayer
                  src={reel.media.url}
                  hlsUrl={reel.media.hlsUrl}
                  poster={reel.media.posterUrl}
                  mediaId={reel.media.id}
                  distance={d}
                  isActive={isActive && isCurrent}
                  muted={muted}
                  onMutedChange={onMutedChange}
                  disableLoop={disableLoop}
                  onEnded={
                    isActive && isCurrent ? handleEnded : undefined
                  }
                  onDoubleTapLike={() => {
                    if (!requireLogin()) return;
                    void like.toggle();
                  }}
                  onLongPressMenu={onOpenMenu}
                  onContextMenu={onOpenMenu}
                />

                {/* Overlays only on the focused card */}
                {isCurrent && (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent pt-24 pb-10">
                      <div className="pointer-events-auto flex items-end justify-between gap-3 px-4 pr-16">
                        <div className="min-w-0 max-w-[78%] space-y-1 text-white">
                          <Link
                            href={`/u/${activeReel.author.username}`}
                            className="inline-block rounded font-display text-sm font-bold drop-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                          >
                            @{activeReel.author.username}
                          </Link>
                          <p className="line-clamp-3 text-sm leading-snug text-white/95 drop-shadow">
                            {caption}
                          </p>
                          {multiVideo && (
                            <p className="text-[11px] tabular-nums text-white/70">
                              {videoIndex + 1} / {group.videos.length}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {multiVideo && (
                      <div className="pointer-events-none absolute inset-x-0 top-[max(3.5rem,env(safe-area-inset-top))] z-20 flex justify-center gap-1.5 px-10 lg:top-4">
                        {group.videos.map((v, i) => (
                          <span
                            key={v.id}
                            className={cn(
                              "h-0.5 flex-1 max-w-10 rounded-full transition-colors duration-300",
                              i === videoIndex ? "bg-white" : "bg-white/35"
                            )}
                          />
                        ))}
                      </div>
                    )}

          <ReelsActions
            reel={activeReel}
            liked={like.liked}
            likeCount={like.likeCount}
            starred={star.starred}
            onToggleLike={() => void like.toggle()}
            onToggleStar={() => void star.toggle()}
            muted={muted}
            onToggleMute={() => onMutedChange(!muted)}
            onShare={() => onShare(activeReel)}
            onToggleExpand={() => onExpand(videoIndex)}
            onComment={
              onComment
                ? () =>
                    onComment(
                      activeReel.postId,
                      commentCountOverride ?? activeReel.commentCount
                    )
                : undefined
            }
            commentCount={commentCountOverride}
            className="absolute right-2 bottom-28 z-20 sm:right-3"
          />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Instagram-style side arrows */}
        {showSideNav && (
          <>
            <button
              type="button"
              disabled={!canHPrev || animating}
              onClick={() => goH(videoIndex - 1)}
              className={sideNavBtnClass}
              style={{ left: arrowOffset }}
              aria-label="이전 영상"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={!canHNext || animating}
              onClick={() => goH(videoIndex + 1)}
              className={sideNavBtnClass}
              style={{ right: arrowOffset }}
              aria-label="다음 영상"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
