"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";
import { userDisplayName } from "@/lib/user-public-select";
import type { ReelItem } from "@/lib/reels/types";
import type { FeedVideoGroup } from "@/lib/feed-video-viewer";
import { ReelsPlayer, type ReelsPlayerHandle } from "@/components/reels/reels-player";
import { ReelNotePage } from "@/components/reels/reel-note-page";
import { ReelsActions } from "@/components/reels/reels-actions";
import { VideoOverlayCaption } from "@/components/reels/video-overlay-caption";
import {
  ReelsCommentMotionRoot,
  useCompactReelsViewport,
  useReelsCommentMotion,
} from "@/components/reels/reels-comment-motion";
import { cn } from "@/lib/utils";
import { REELS_H_NAV_DURATION_MS } from "@/lib/reels/constants";
import {
  animateScrollPortToSelector,
  scrollPortToSelector,
} from "@/lib/reels/scroll-port";

/** Desktop stage width — one card in the center column, no neighbor peek. */
const DESKTOP_CARD_CLASS =
  "lg:h-[min(100%,920px)] lg:w-[min(420px,calc(100%-15rem))]";

/** Half of the desktop card, used to park prev/next just outside the frame. */
const DESKTOP_CARD_HALF = "min(210px, 50% - 7.5rem)";

/** Video + comments stage — only used while the comments panel is open. */
const DESKTOP_STAGE_WRAPPER_OPEN =
  "lg:h-[min(100%,920px)] lg:w-[min(calc(420px+24rem),100%)] lg:max-w-[calc(420px+24rem)]";

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
  onActiveVideoChange?: (videoIndex: number) => void;
  forcedVideoIndex?: number | null;
  horizontalNavEnabled?: boolean;
  onComment?: (postId: string, commentCount: number) => void;
  commentCountOverride?: number;
  commentsOpen?: boolean;
  commentsPanel?: ReactNode;
};

export function FeedVideoPostSlide(props: Props) {
  return (
    <ReelsCommentMotionRoot enabled={!!props.commentsOpen}>
      <FeedVideoPostSlideBody {...props} />
    </ReelsCommentMotionRoot>
  );
}

function FeedVideoPostSlideBody({
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
  onActiveVideoChange,
  forcedVideoIndex = null,
  horizontalNavEnabled = true,
  onComment,
  commentCountOverride,
  commentsOpen = false,
  commentsPanel,
}: Props) {
  const motion = useReelsCommentMotion();
  const compact = useCompactReelsViewport();
  const hScrollerRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<Array<ReelsPlayerHandle | null>>([]);
  const [videoIndex, setVideoIndex] = useState(() =>
    Math.max(0, Math.min(initialVideoIndex, group.videos.length - 1))
  );
  const startedRef = useRef(false);
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
  const showSideNav =
    isActive && multiVideo && horizontalNavEnabled && !commentsOpen;

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    const callback = authCallbackPath ?? `/`;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
    return false;
  }

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior) => {
    scrollPortToSelector(
      hScrollerRef.current,
      `[data-feed-video-h="${idx}"]`,
      "x",
      behavior
    );
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
      if (clamped === videoIndex) {
        scrollToIndex(clamped, "auto");
        return;
      }
      setVideoIndex(clamped);
      onActiveVideoChange?.(clamped);
      animateScrollPortToSelector(
        hScrollerRef.current,
        `[data-feed-video-h="${clamped}"]`,
        "x",
        REELS_H_NAV_DURATION_MS
      );
    },
    [group.videos.length, onActiveVideoChange, scrollToIndex, videoIndex]
  );

  useEffect(() => {
    if (forcedVideoIndex == null) return;
    goH(forcedVideoIndex);
  }, [forcedVideoIndex, goH]);

  useEffect(() => {
    if (!isActive || !multiVideo || !horizontalNavEnabled || commentsOpen) return;
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
  }, [commentsOpen, goH, horizontalNavEnabled, isActive, multiVideo, videoIndex]);

  // Keep the active clip snapped after the column width changes.
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

  const sideNavBtnClass = cn(
    "pointer-events-auto absolute top-1/2 z-40 hidden -translate-y-1/2",
    "h-11 w-11 items-center justify-center rounded-full",
    "border border-white/15 bg-white/20 text-white shadow-lg backdrop-blur-md transition",
    "hover:bg-white/35 hover:scale-105 active:scale-95",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
    "disabled:pointer-events-none disabled:opacity-30",
    "lg:flex"
  );

  const videoCard = (
    <div
      ref={motion.bindVideo}
      className={cn(
        "relative isolate h-full w-full overflow-hidden bg-black",
        commentsOpen
          ? "max-lg:pointer-events-none lg:w-[min(420px,calc(100%-15rem))] lg:shrink-0 lg:rounded-none"
          : "lg:rounded-2xl"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={hScrollerRef}
        data-reels-scroller="x"
        className={cn(
          "flex h-full w-full overflow-x-auto overflow-y-hidden overscroll-x-contain",
          "snap-x snap-mandatory [overflow-anchor:none]",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
        role="list"
        aria-label={t("feed.s1508wel")}
      >
        {group.videos.map((reel, vi) => {
          const d = isActive ? Math.abs(vi - videoIndex) : distance + 1;
          const isCurrent = vi === videoIndex;
          return (
            <div
              key={reel.id}
              data-feed-video-h={vi}
              role="listitem"
              className="relative h-full w-full shrink-0 snap-center bg-black"
            >
              {reel.mediaType === "NOTE" ? (
                <ReelNotePage text={reel.noteText ?? ""} />
              ) : (
                <ReelsPlayer
                  ref={(el) => {
                    playerRefs.current[vi] = el;
                  }}
                  src={reel.media.url}
                  hlsUrl={reel.media.hlsUrl}
                  poster={reel.media.posterUrl}
                  kind={reel.mediaType === "IMAGE" ? "IMAGE" : "VIDEO"}
                  mediaId={reel.media.id}
                  mediaPriceKrw={reel.media.priceKrw}
                  distance={d}
                  isActive={isActive && isCurrent}
                  muted={muted}
                  onMutedChange={onMutedChange}
                  disableLoop={disableLoop}
                  onEnded={isActive && isCurrent ? handleEnded : undefined}
                  onDoubleTapLike={() => {
                    if (!requireLogin()) return;
                    void like.toggle();
                  }}
                  onLongPressMenu={onOpenMenu}
                  onContextMenu={onOpenMenu}
                  gesturesDisabled={commentsOpen && compact}
                />
              )}

              {isCurrent && (
                <>
                  <VideoOverlayCaption
                    username={activeReel.author.username}
                    authorImage={activeReel.author.image}
                    authorName={activeReel.author.name}
                    authorId={activeReel.author.id}
                    collaborators={activeReel.collaborators}
                    title={reel.mediaType === "NOTE" ? null : activeReel.title}
                    content={reel.mediaType === "NOTE" ? "" : activeReel.content}
                  />

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
                    onToggleExpand={
                      reel.mediaType === "NOTE"
                        ? undefined
                        : () => {
                            void playerRefs.current[videoIndex]?.enterFullscreen();
                          }
                    }
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
    </div>
  );

  return (
    <section
      data-reel-index={index}
      data-reel-id={group.postId}
      className="relative flex h-full w-full shrink-0 snap-start snap-always items-center justify-center overflow-hidden select-none bg-black lg:bg-transparent"
      aria-label={`Videos by ${userDisplayName(activeReel.author)}`}
      ref={motion.bindFrame}
      onClick={
        onBackgroundClick && !commentsOpen
          ? (e) => {
              if (e.target === e.currentTarget) onBackgroundClick();
            }
          : undefined
      }
    >
      <div
        className={cn(
          "relative mx-auto flex h-full min-w-0 items-stretch self-stretch",
          commentsOpen
            ? cn(
                "w-full",
                DESKTOP_STAGE_WRAPPER_OPEN,
                "lg:overflow-hidden lg:rounded-2xl lg:shadow-2xl lg:ring-1 lg:ring-white/10"
              )
            : cn("w-full", DESKTOP_CARD_CLASS)
        )}
      >
        {videoCard}
        {commentsPanel}
      </div>

      {showSideNav ? (
        <>
          <button
            type="button"
            disabled={!canHPrev}
            onClick={() => goH(videoIndex - 1)}
            className={sideNavBtnClass}
            style={{
              left: `max(0.75rem, calc(50% - ${DESKTOP_CARD_HALF} - 3.25rem))`,
            }}
            aria-label={t("feed.snrsq28")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={!canHNext}
            onClick={() => goH(videoIndex + 1)}
            className={sideNavBtnClass}
            style={{
              right: `max(4.75rem, calc(50% - ${DESKTOP_CARD_HALF} - 3.25rem))`,
            }}
            aria-label={t("feed.sebaazc")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}
    </section>
  );
}
