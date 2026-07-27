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
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";
import { userDisplayName } from "@/lib/user-public-select";
import type { ReelItem } from "@/lib/reels/types";
import type { FeedVideoGroup } from "@/lib/feed-video-viewer";
import { ReelsPlayer } from "@/components/reels/reels-player";
import { ReelsActions } from "@/components/reels/reels-actions";
import { cn } from "@/lib/utils";

type Props = {
  group: FeedVideoGroup;
  index: number;
  activeIndex: number;
  /** Video within this post to land on when the group becomes active. */
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
  /** Parent forces horizontal position (e.g. after closing expand lightbox). */
  forcedVideoIndex?: number | null;
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
}: Props) {
  const hScrollerRef = useRef<HTMLDivElement>(null);
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

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    const callback = authCallbackPath ?? `/feed`;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
    return false;
  }

  // Jump to initial video once when this group mounts / start changes.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const idx = Math.max(0, Math.min(initialVideoIndex, group.videos.length - 1));
    setVideoIndex(idx);
    requestAnimationFrame(() => {
      const el = hScrollerRef.current?.querySelector<HTMLElement>(
        `[data-feed-video-h="${idx}"]`
      );
      el?.scrollIntoView({ behavior: "instant" as ScrollBehavior, inline: "start", block: "nearest" });
    });
  }, [initialVideoIndex, group.videos.length]);

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
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("scroll", onScroll);
    };
  }, [syncFromScroll, group.videos.length]);

  const goH = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(group.videos.length - 1, next));
      const el = hScrollerRef.current?.querySelector<HTMLElement>(
        `[data-feed-video-h="${clamped}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      setVideoIndex(clamped);
      onActiveVideoChange?.(clamped);
    },
    [group.videos.length, onActiveVideoChange]
  );

  useEffect(() => {
    if (forcedVideoIndex == null) return;
    goH(forcedVideoIndex);
  }, [forcedVideoIndex, goH]);

  // When video ends: next in post, else notify parent (next post).
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

  return (
    <section
      data-reel-index={index}
      data-reel-id={group.postId}
      className="relative flex h-[100dvh] w-full shrink-0 snap-start snap-always items-center justify-center bg-black"
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
        className="relative h-full w-full lg:h-[min(100dvh,920px)] lg:max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={hScrollerRef}
          className={cn(
            "flex h-full w-full overflow-x-auto overflow-y-hidden overscroll-x-contain",
            "snap-x snap-mandatory scroll-smooth",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
          role="list"
          aria-label="같은 게시물 영상"
        >
          {group.videos.map((reel, vi) => {
            const d = isActive ? Math.abs(vi - videoIndex) : distance + 1;
            return (
              <div
                key={reel.id}
                data-feed-video-h={vi}
                role="listitem"
                className="relative h-full w-full shrink-0 snap-start snap-always bg-black"
              >
                <ReelsPlayer
                  src={reel.media.url}
                  hlsUrl={reel.media.hlsUrl}
                  poster={reel.media.posterUrl}
                  mediaId={reel.media.id}
                  distance={d}
                  isActive={isActive && vi === videoIndex}
                  muted={muted}
                  onMutedChange={onMutedChange}
                  disableLoop={disableLoop}
                  onEnded={
                    isActive && vi === videoIndex ? handleEnded : undefined
                  }
                  onDoubleTapLike={() => {
                    if (!requireLogin()) return;
                    void like.toggle();
                  }}
                  onLongPressMenu={onOpenMenu}
                  onContextMenu={onOpenMenu}
                />
              </div>
            );
          })}
        </div>

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
              {group.videos.length > 1 && (
                <p className="text-[11px] tabular-nums text-white/70">
                  {videoIndex + 1} / {group.videos.length}
                </p>
              )}
            </div>
          </div>
        </div>

        {group.videos.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 top-[max(3.5rem,env(safe-area-inset-top))] z-20 flex justify-center gap-1.5 px-10">
            {group.videos.map((v, i) => (
              <span
                key={v.id}
                className={cn(
                  "h-0.5 flex-1 max-w-10 rounded-full transition-colors",
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
          className="absolute right-2 bottom-28 z-20 sm:right-3 lg:right-[-3.75rem] lg:bottom-1/2 lg:translate-y-1/2"
        />
      </div>
    </section>
  );
}
