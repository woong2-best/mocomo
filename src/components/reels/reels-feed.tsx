"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReelItem, ReelsPageResponse } from "@/lib/reels/types";
import { REELS_PREFETCH_REMAINING } from "@/lib/reels/constants";
import { dismissReel, getDismissedReelIds } from "@/lib/reels/dismissed";
import { ReelsSlide } from "@/components/reels/reels-slide";
import {
  ReelsContextMenu,
  type ReelsMenuAction,
} from "@/components/reels/reels-context-menu";
import { useReelsMutedState } from "@/components/reels/reels-player";
import { ReelsCommentsPanel } from "@/components/reels/reels-comments-panel";
import { engageStar } from "@/lib/post-engage-client";
import { getVideoPlaybackController } from "@/lib/video-playback";

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
  const fetchingRef = useRef(false);

  // Jump to deep-linked post once
  useEffect(() => {
    if (!startPostId || items.length === 0) return;
    const idx = items.findIndex((i) => i.postId === startPostId);
    if (idx < 0) return;
    setActiveIndex(idx);
    requestAnimationFrame(() => {
      const el = scrollerRef.current?.querySelector<HTMLElement>(
        `[data-reel-index="${idx}"]`
      );
      el?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
    });
  }, [startPostId, items]);

  const loadMore = useCallback(async () => {
    if (!cursor || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/reels?cursor=${encodeURIComponent(cursor)}`, {
        credentials: "same-origin",
      });
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
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    if (items.length - activeIndex <= REELS_PREFETCH_REMAINING) {
      void loadMore();
    }
  }, [activeIndex, items.length, loadMore]);

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
  }, [activeIndex, goTo, muted, setMuted]);

  const openMenu = useCallback((index: number, x: number, y: number) => {
    setMenu({ open: true, x, y, index });
  }, []);

  const shareReel = useCallback(
    async (reel: ReelItem) => {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/reels?v=${reel.postId}`
          : `/reels?v=${reel.postId}`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: reel.title ?? "MoCoMo Reels",
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
    },
    []
  );

  const onMenuAction = useCallback(
    (action: ReelsMenuAction) => {
      const reel = items[menu.index];
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
    [items, menu.index, router, shareReel]
  );

  if (items.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p className="font-display text-lg font-bold">아직 볼 영상이 없어요</p>
        <p className="text-sm text-white/70">세로 영상을 업로드하면 여기에 나타납니다.</p>
        <Link
          href="/compose"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
        >
          업로드하기
        </Link>
        <Link href="/feed" className="text-sm text-white/70 underline">
          피드로 돌아가기
        </Link>
      </div>
    );
  }

  const activeReel = items[menu.index] ?? items[activeIndex];

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-black">
      <div
        className={cn(
          "relative min-h-0 min-w-0 flex-1 transition-[max-width] duration-300 ease-out",
          commentsPanel && "lg:max-w-[calc(100%-24rem)]"
        )}
      >
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          href="/feed"
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="pointer-events-none font-display text-sm font-bold tracking-wide text-white/90 drop-shadow">
          Reels
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
        aria-label="Short video feed"
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
            onComment={(postId, count) => setCommentsPanel({ postId, count })}
            commentCountOverride={
              commentsPanel?.postId === reel.postId
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
    </div>
  );
}
