"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReelItem } from "@/lib/reels/types";
import type { FeedVideoGroup } from "@/lib/feed-video-viewer";
import { REELS_PREFETCH_REMAINING } from "@/lib/reels/constants";
import {
  ReelsContextMenu,
  type ReelsMenuAction,
} from "@/components/reels/reels-context-menu";
import { useReelsMutedState } from "@/components/reels/reels-player";
import { engageStar } from "@/lib/post-engage-client";
import { getVideoPlaybackController } from "@/lib/video-playback";
import {
  FEED_VIDEO_VIEWER_HISTORY_KEY,
  lockMainScroll,
} from "@/lib/feed-video-viewer";
import { FeedVideoPostSlide } from "@/components/feed/feed-video-post-slide";
import { FeedVideoExpandLightbox } from "@/components/feed/feed-video-expand-lightbox";
import { ReelsCommentsPanel } from "@/components/reels/reels-comments-panel";

type Props = {
  groups: FeedVideoGroup[];
  startGroupIndex: number;
  startVideoIndex: number;
  onClose: () => void;
  onNearEnd?: () => void;
  loadingMore?: boolean;
};

export function FeedVideoViewer({
  groups,
  startGroupIndex,
  startVideoIndex,
  onClose,
  onNearEnd,
  loadingMore = false,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, Math.min(startGroupIndex, Math.max(0, groups.length - 1)))
  );
  const videoIndexByGroupRef = useRef<Record<number, number>>({
    [startGroupIndex]: startVideoIndex,
  });
  const [muted, setMuted] = useReelsMutedState();
  const [menu, setMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    index: number;
  }>({ open: false, x: 0, y: 0, index: 0 });
  const [expand, setExpand] = useState<{
    groupIndex: number;
    videoIndex: number;
  } | null>(null);
  const [commentsPanel, setCommentsPanel] = useState<{
    postId: string;
    count: number;
  } | null>(null);
  const [forcedVideoByGroup, setForcedVideoByGroup] = useState<
    Record<number, number>
  >({});
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname() ?? "/feed";
  const closedRef = useRef(false);
  const closingViaUiRef = useRef(false);
  const startedRef = useRef(false);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    closingViaUiRef.current = true;
    onClose();
    if (
      typeof window !== "undefined" &&
      window.history.state?.[FEED_VIDEO_VIEWER_HISTORY_KEY]
    ) {
      window.history.back();
    }
  }, [onClose]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.history.state?.[FEED_VIDEO_VIEWER_HISTORY_KEY]) {
      window.history.pushState(
        {
          ...(window.history.state ?? {}),
          [FEED_VIDEO_VIEWER_HISTORY_KEY]: true,
        },
        ""
      );
    }

    const onPopState = () => {
      if (closingViaUiRef.current) {
        closingViaUiRef.current = false;
        return;
      }
      if (closedRef.current) return;
      closedRef.current = true;
      onClose();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [onClose]);

  useEffect(() => {
    const unlock = lockMainScroll();
    return unlock;
  }, []);

  useEffect(() => {
    if (startedRef.current || groups.length === 0) return;
    startedRef.current = true;
    const idx = Math.max(0, Math.min(startGroupIndex, groups.length - 1));
    setActiveIndex(idx);
    requestAnimationFrame(() => {
      const el = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-reel-index="${idx}"]`
      );
      el?.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
        block: "start",
      });
    });
  }, [startGroupIndex, groups.length]);

  useEffect(() => {
    if (groups.length - activeIndex <= REELS_PREFETCH_REMAINING) {
      onNearEnd?.();
    }
  }, [activeIndex, groups.length, onNearEnd]);

  const syncActiveFromScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>("[data-reel-index]");
    const mid = root.scrollTop + root.clientHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((el) => {
      const idx = Number(el.dataset.reelIndex);
      if (!Number.isFinite(idx)) return;
      const center = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    setActiveIndex((prev) => (prev === best ? prev : best));
    getVideoPlaybackController()?.noteScroll(root.scrollTop);
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncActiveFromScroll);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    syncActiveFromScroll();
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("scroll", onScroll);
    };
  }, [syncActiveFromScroll, groups.length]);

  // Re-snap active slide after rotate so 100dvh reflow does not leave it mid-viewport.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    let timer: number | null = null;
    const resnap = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const el = root.querySelector<HTMLElement>(
          `[data-reel-index="${activeIndex}"]`
        );
        el?.scrollIntoView({
          behavior: "instant" as ScrollBehavior,
          block: "start",
        });
      }, 120);
    };
    window.addEventListener("orientationchange", resnap);
    const orient = window.screen?.orientation;
    orient?.addEventListener?.("change", resnap);
    return () => {
      if (timer != null) window.clearTimeout(timer);
      window.removeEventListener("orientationchange", resnap);
      orient?.removeEventListener?.("change", resnap);
    };
  }, [activeIndex]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(groups.length - 1, index));
      const el = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-reel-index="${clamped}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveIndex(clamped);
    },
    [groups.length]
  );

  const goNext = useCallback(() => {
    if (activeIndex < groups.length - 1) goTo(activeIndex + 1);
  }, [activeIndex, goTo, groups.length]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || expand || commentsPanel) return;

    let wheelLock = false;
    const onWheelThrottled = (e: WheelEvent) => {
      // Prefer horizontal trackpad for in-post videos — only vertical for posts.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (wheelLock) {
        e.preventDefault();
        return;
      }
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      wheelLock = true;
      if (e.deltaY > 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
      window.setTimeout(() => {
        wheelLock = false;
      }, 420);
    };

    root.addEventListener("wheel", onWheelThrottled, { passive: false });
    return () => root.removeEventListener("wheel", onWheelThrottled);
  }, [activeIndex, commentsPanel, expand, goTo]);

  useEffect(() => {
    if (expand || commentsPanel) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goTo(activeIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(activeIndex - 1);
      } else if (e.key === "m" || e.key === "M") {
        setMuted(!muted);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, close, commentsPanel, expand, goTo, muted, setMuted]);

  const openMenu = useCallback((index: number, x: number, y: number) => {
    setMenu({ open: true, x, y, index });
  }, []);

  const shareReel = useCallback(async (reel: ReelItem) => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/post/${reel.postId}`
        : `/post/${reel.postId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: reel.title ?? "MoCoMo",
          url,
        });
        return;
      }
    } catch {
      /* fall through */
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }, []);

  const onMenuAction = useCallback(
    (action: ReelsMenuAction) => {
      const group = groups[menu.index];
      const reel =
        group?.videos[videoIndexByGroupRef.current[menu.index] ?? 0] ??
        group?.videos[0];
      if (!reel) return;
      if (action === "copy-link") {
        void shareReel(reel);
        return;
      }
      if (action === "save") {
        startTransition(() => {
          void engageStar(reel.postId);
        });
        return;
      }
      if (action === "report") {
        close();
        router.push(`/post/${reel.postId}?report=1`);
      }
    },
    [close, groups, menu.index, router, shareReel]
  );

  if (typeof document === "undefined" || groups.length === 0) return null;

  const menuGroup = groups[menu.index] ?? groups[activeIndex];
  const activeReel =
    menuGroup?.videos[videoIndexByGroupRef.current[menu.index] ?? 0] ??
    menuGroup?.videos[0];
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < groups.length - 1;
  const expandGroup =
    expand != null ? groups[expand.groupIndex] ?? null : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="피드 영상 보기"
      className="fixed inset-0 z-[200] flex overflow-hidden bg-black"
    >
      <div
        className={cn(
          "relative min-h-0 min-w-0 flex-1 transition-[max-width] duration-300 ease-out",
          commentsPanel && "lg:max-w-[calc(100%-24rem)]"
        )}
      >
      <header
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))]",
          expand && "hidden"
        )}
      >
        <button
          type="button"
          onClick={close}
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="뒤로"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="pointer-events-none font-display text-sm font-bold tracking-wide text-white/90 drop-shadow">
          영상
        </p>
        <span className="w-10" aria-hidden />
      </header>

      <div
        ref={scrollerRef}
        className={cn(
          "h-[100dvh] w-full overflow-y-auto overflow-x-hidden overscroll-y-contain",
          "snap-y snap-mandatory scroll-smooth",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
        role="feed"
        aria-label="피드 영상"
        tabIndex={0}
      >
        {groups.map((group, index) => (
          <FeedVideoPostSlide
            key={group.postId}
            group={group}
            index={index}
            activeIndex={activeIndex}
            initialVideoIndex={
              index === startGroupIndex
                ? startVideoIndex
                : videoIndexByGroupRef.current[index] ?? 0
            }
            muted={muted}
            onMutedChange={setMuted}
            onOpenMenu={(x, y) => openMenu(index, x, y)}
            onShare={(reel) => void shareReel(reel)}
            disableLoop
            onEnded={index === activeIndex ? goNext : undefined}
            authCallbackPath={pathname}
            onBackgroundClick={close}
            onExpand={(videoIndex) => setExpand({ groupIndex: index, videoIndex })}
            onActiveVideoChange={(videoIndex) => {
              videoIndexByGroupRef.current[index] = videoIndex;
            }}
            forcedVideoIndex={forcedVideoByGroup[index] ?? null}
            horizontalNavEnabled={!expand && !commentsPanel}
            onComment={(postId, count) =>
              setCommentsPanel({ postId, count })
            }
            commentCountOverride={
              commentsPanel?.postId === group.postId
                ? commentsPanel.count
                : undefined
            }
          />
        ))}
        {loadingMore && (
          <div className="flex h-16 items-center justify-center bg-black">
            <Loader2 className="h-5 w-5 animate-spin text-white/70" />
          </div>
        )}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute z-40 flex flex-col gap-2",
          "right-3 top-[max(4.5rem,env(safe-area-inset-top))]",
          "lg:right-10 lg:top-1/2 lg:-translate-y-1/2 lg:gap-3",
          (expand || commentsPanel) && "hidden"
        )}
      >
        <button
          type="button"
          disabled={!canPrev}
          onClick={goPrev}
          className={cn(
            "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition",
            "hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
            "disabled:pointer-events-none disabled:opacity-30"
          )}
          aria-label="이전 게시물 영상"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={goNext}
          className={cn(
            "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition",
            "hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
            "disabled:pointer-events-none disabled:opacity-30"
          )}
          aria-label="다음 게시물 영상"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      {activeReel && (
        <ReelsContextMenu
          open={menu.open}
          reel={activeReel}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu((m) => ({ ...m, open: false }))}
          onAction={onMenuAction}
        />
      )}

      {expand && expandGroup && (
        <FeedVideoExpandLightbox
          open
          videos={expandGroup.videos}
          initialIndex={expand.videoIndex}
          onClose={() => {
            const gi = expand.groupIndex;
            const vi = expand.videoIndex;
            videoIndexByGroupRef.current[gi] = vi;
            setForcedVideoByGroup((prev) => ({ ...prev, [gi]: vi }));
            setExpand(null);
          }}
          onIndexChange={(videoIndex) => {
            videoIndexByGroupRef.current[expand.groupIndex] = videoIndex;
            setExpand({ groupIndex: expand.groupIndex, videoIndex });
          }}
        />
      )}
      </div>

      <ReelsCommentsPanel
        open={!!commentsPanel}
        postId={commentsPanel?.postId ?? ""}
        initialCount={commentsPanel?.count ?? 0}
        onClose={() => setCommentsPanel(null)}
        onCountChange={(count) =>
          setCommentsPanel((prev) =>
            prev && prev.count !== count ? { ...prev, count } : prev
          )
        }
      />
    </div>,
    document.body
  );
}
