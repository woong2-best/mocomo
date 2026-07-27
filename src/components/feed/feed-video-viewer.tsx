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
import { REELS_PREFETCH_REMAINING } from "@/lib/reels/constants";
import { ReelsSlide } from "@/components/reels/reels-slide";
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

type Props = {
  items: ReelItem[];
  startIndex: number;
  onClose: () => void;
  onNearEnd?: () => void;
  loadingMore?: boolean;
};

export function FeedVideoViewer({
  items,
  startIndex,
  onClose,
  onNearEnd,
  loadingMore = false,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, Math.min(startIndex, Math.max(0, items.length - 1)))
  );
  const [muted, setMuted] = useReelsMutedState();
  const [menu, setMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    index: number;
  }>({ open: false, x: 0, y: 0, index: 0 });
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname() ?? "/feed";
  const closedRef = useRef(false);
  const closingViaUiRef = useRef(false);
  const startedRef = useRef(false);
  const [cinema, setCinema] = useState(false);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    closingViaUiRef.current = true;
    // Close first so the feed (and its scroll position) is revealed immediately.
    onClose();
    if (
      typeof window !== "undefined" &&
      window.history.state?.[FEED_VIDEO_VIEWER_HISTORY_KEY]
    ) {
      window.history.back();
    }
  }, [onClose]);

  // Synthetic history entry: device/browser back dismisses the viewer.
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

  // Jump to the tapped video once mounted.
  useEffect(() => {
    if (startedRef.current || items.length === 0) return;
    startedRef.current = true;
    const idx = Math.max(0, Math.min(startIndex, items.length - 1));
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
  }, [startIndex, items.length]);

  useEffect(() => {
    if (items.length - activeIndex <= REELS_PREFETCH_REMAINING) {
      onNearEnd?.();
    }
  }, [activeIndex, items.length, onNearEnd]);

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
  }, [syncActiveFromScroll, items.length]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      const el = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-reel-index="${clamped}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveIndex(clamped);
    },
    [items.length]
  );

  const goNext = useCallback(() => {
    if (activeIndex < items.length - 1) goTo(activeIndex + 1);
  }, [activeIndex, goTo, items.length]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    let wheelLock = false;
    const onWheelThrottled = (e: WheelEvent) => {
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
  }, [activeIndex, goTo]);

  useEffect(() => {
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
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
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
  }, [activeIndex, close, goTo, muted, setMuted]);

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
      const reel = items[menu.index];
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
    [close, items, menu.index, router, shareReel]
  );

  if (typeof document === "undefined" || items.length === 0) return null;

  const activeReel = items[menu.index] ?? items[activeIndex];
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < items.length - 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="피드 영상 보기"
      className="fixed inset-0 z-[200] overflow-hidden bg-black"
    >
      <header
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))]",
          cinema && "hidden"
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
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          cinema && "overflow-hidden touch-none"
        )}
        role="feed"
        aria-label="피드 영상"
        tabIndex={0}
      >
        {items.map((reel, index) => (
          <ReelsSlide
            key={reel.id}
            reel={reel}
            index={index}
            activeIndex={activeIndex}
            muted={muted}
            onMutedChange={setMuted}
            onOpenMenu={(x, y) => openMenu(index, x, y)}
            onShare={() => void shareReel(reel)}
            disableLoop
            onEnded={index === activeIndex ? goNext : undefined}
            authCallbackPath={pathname}
            variant="viewer"
            onBackgroundClick={close}
            onCinemaChange={index === activeIndex ? setCinema : undefined}
          />
        ))}
        {loadingMore && (
          <div className="flex h-16 items-center justify-center bg-black">
            <Loader2 className="h-5 w-5 animate-spin text-white/70" />
          </div>
        )}
      </div>

      {/* X-style up / down video navigation */}
      <div
        className={cn(
          "pointer-events-none absolute z-40 flex flex-col gap-2",
          // Mobile: below header, clear of the action rail
          "right-3 top-[max(4.5rem,env(safe-area-inset-top))]",
          // Desktop: mid-right like X
          "lg:right-10 lg:top-1/2 lg:-translate-y-1/2 lg:gap-3",
          cinema && "hidden"
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
          aria-label="이전 영상"
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
          aria-label="다음 영상"
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
    </div>,
    document.body
  );
}
