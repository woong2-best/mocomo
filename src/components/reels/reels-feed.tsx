"use client";
const i18n = createTranslator("en");


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReelItem, ReelsPageResponse } from "@/lib/reels/types";
import { REELS_PREFETCH_REMAINING } from "@/lib/reels/constants";
import { dismissReel, getDismissedReelIds } from "@/lib/reels/dismissed";
import { groupReelSlides } from "@/lib/reels/text-pages";
import { FeedVideoPostSlide } from "@/components/feed/feed-video-post-slide";
import {
  ReelsContextMenu,
  type ReelsMenuAction,
} from "@/components/reels/reels-context-menu";
import { useReelsMutedState } from "@/components/reels/reels-player";
import { ReelsCommentsPanel } from "@/components/reels/reels-comments-panel";
import { engageStar } from "@/lib/post-engage-client";
import { getVideoPlaybackController } from "@/lib/video-playback";
import { prefetchPostComments } from "@/lib/comments-prefetch-cache";
import { useLocale } from "@/components/providers/locale-provider";
import { absoluteUrl, copyShareUrl } from "@/lib/post-share";
import { scrollPortToSelector } from "@/lib/reels/scroll-port";

type Props = {
  initialItems: ReelItem[];
  initialCursor: string | null;
  startPostId?: string | null;
};

function filterDismissed(items: ReelItem[]): ReelItem[] {
  const dismissed = getDismissedReelIds();
  if (dismissed.size === 0) return items;
  return items.filter((i) => !dismissed.has(i.postId));
}

export function ReelsFeed({ initialItems, initialCursor, startPostId }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useReelsMutedState();
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchingRef = useRef(false);
  const autoLoadBlockedRef = useRef(false);
  const jumpedToStartRef = useRef(false);
  const groups = useMemo(() => groupReelSlides(items), [items]);

  useEffect(() => {
    setItems(filterDismissed(initialItems));
  }, [initialItems]);

  const [menu, setMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    index: number;
  }>({ open: false, x: 0, y: 0, index: 0 });
  const [commentsPanel, setCommentsPanel] = useState<{
    postId: string;
    count: number;
  } | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { t } = useLocale();

  const loadMore = useCallback(async () => {
    if (!cursor || fetchingRef.current || autoLoadBlockedRef.current) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/reels?cursor=${encodeURIComponent(cursor)}`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        autoLoadBlockedRef.current = true;
        return;
      }
      const data = (await res.json()) as ReelsPageResponse;
      const next = filterDismissed(data.items ?? []);
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const item of next) {
          if (!seen.has(item.id)) merged.push(item);
        }
        return merged;
      });
      setCursor(data.nextCursor ?? null);
    } catch (e) {
      console.error("[reels] loadMore", e);
      autoLoadBlockedRef.current = true;
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    if (groups.length - activeIndex <= REELS_PREFETCH_REMAINING) {
      void loadMore();
    }
  }, [activeIndex, groups.length, loadMore]);

  useEffect(() => {
    const postId = groups[activeIndex]?.postId;
    if (postId) prefetchPostComments(postId);
  }, [activeIndex, groups]);

  useEffect(() => {
    const activePostId = groups[activeIndex]?.postId;
    if (commentsPanel && activePostId && commentsPanel.postId !== activePostId) {
      setCommentsPanel(null);
    }
  }, [activeIndex, commentsPanel, groups]);

  // Jump to deep-linked post once — never again when loadMore appends items
  useEffect(() => {
    if (jumpedToStartRef.current || !startPostId || groups.length === 0) return;
    const idx = groups.findIndex((group) => group.postId === startPostId);
    if (idx < 0) return;
    jumpedToStartRef.current = true;
    setActiveIndex(idx);
    requestAnimationFrame(() => {
      scrollPortToSelector(
        scrollerRef.current,
        `[data-reel-index="${idx}"]`,
        "y",
        "auto"
      );
    });
  }, [startPostId, groups]);

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
        scrollPortToSelector(
          root,
          `[data-reel-index="${activeIndex}"]`,
          "y",
          "auto"
        );
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
      scrollPortToSelector(
        scrollerRef.current,
        `[data-reel-index="${clamped}"]`,
        "y",
        "smooth"
      );
      setActiveIndex(clamped);
    },
    [groups.length]
  );

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
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
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
  }, [activeIndex, goTo, muted, setMuted]);

  const openMenu = useCallback((index: number, x: number, y: number) => {
    setMenu({ open: true, x, y, index });
  }, []);

  const shareReel = useCallback(
    async (reel: ReelItem) => {
      const url = absoluteUrl(`/reels?v=${reel.postId}`);
      await copyShareUrl(url, i18n("toast.linkCopied"));
    },
    [t]
  );

  const onMenuAction = useCallback(
    (action: ReelsMenuAction) => {
      const reel = groups[menu.index]?.slides[0];
      if (!reel) return;
      if (action === "not-interested") {
        dismissReel(reel.postId);
        setItems((prev) => prev.filter((i) => i.postId !== reel.postId));
        return;
      }
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
        router.push(`/post/${reel.postId}?report=1`);
      }
    },
    [groups, menu.index, router, shareReel]
  );

  if (groups.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white lg:bg-background lg:text-foreground">
        <p className="font-display text-lg font-bold">{i18n("reels.sy1abv7")}</p>
        <p className="text-sm text-white/70">{i18n("reels.s1lhnbz0")}</p>
        <Link
          href="/compose"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
        >
          업로드하기
        </Link>
        <Link href="/" className="text-sm text-white/70 underline">
          피드로 돌아가기
        </Link>
      </div>
    );
  }

  const activeReel = groups[menu.index]?.slides[0] ?? groups[activeIndex]?.slides[0];
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < groups.length - 1;

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-black lg:bg-transparent">
      <div
        className={cn(
          "absolute inset-0 min-h-0 min-w-0 select-none"
        )}
      >
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </header>

      <div
        ref={scrollerRef}
        className={cn(
          "absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-y-contain",
          "snap-y snap-mandatory [overflow-anchor:none]",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
        data-reels-scroller="y"
        role="feed"
        aria-label="Short video feed"
      >
        {groups.map((group, index) => (
          <FeedVideoPostSlide
            key={group.key}
            group={{ postId: group.postId, videos: group.slides }}
            index={index}
            activeIndex={activeIndex}
            muted={muted}
            onMutedChange={setMuted}
            onOpenMenu={(x, y) => openMenu(index, x, y)}
            onShare={(reel) => void shareReel(reel)}
            onComment={(postId, count) => setCommentsPanel({ postId, count })}
            commentCountOverride={
              commentsPanel?.postId === group.postId ? commentsPanel.count : undefined
            }
            commentsOpen={!!commentsPanel && commentsPanel.postId === group.postId}
            commentsPanel={
              commentsPanel?.postId === group.postId ? (
                <ReelsCommentsPanel
                  layout="inline"
                  open
                  postId={commentsPanel.postId}
                  initialCount={commentsPanel.count}
                  onClose={() => setCommentsPanel(null)}
                  onCountChange={(count) =>
                    setCommentsPanel((prev) =>
                      prev && prev.count !== count ? { ...prev, count } : prev
                    )
                  }
                />
              ) : undefined
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
          "right-2 top-[max(4.5rem,env(safe-area-inset-top))]",
          "lg:right-3 lg:top-1/2 lg:-translate-y-1/2 lg:gap-3"
        )}
      >
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => goTo(activeIndex - 1)}
          className={cn(
            "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md transition",
            "hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
            "disabled:pointer-events-none disabled:opacity-30"
          )}
          aria-label={t("feed.s2a5jqc")}
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => goTo(activeIndex + 1)}
          className={cn(
            "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md transition",
            "hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
            "disabled:pointer-events-none disabled:opacity-30"
          )}
          aria-label={t("feed.s186cci4")}
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
      </div>
    </div>
  );
}
