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
import { X } from "lucide-react";
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";
import { userDisplayName } from "@/lib/user-public-select";
import type { ReelItem } from "@/lib/reels/types";
import { ReelsPlayer } from "@/components/reels/reels-player";
import { ReelsActions } from "@/components/reels/reels-actions";
import { cn } from "@/lib/utils";

const CINEMA_IDLE_MS = 1600;

type Props = {
  reel: ReelItem;
  index: number;
  activeIndex: number;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onOpenMenu: (x: number, y: number) => void;
  onShare: () => void;
  disableLoop?: boolean;
  onEnded?: () => void;
  /** Override sign-in callback URL (defaults to /reels?v=…). */
  authCallbackPath?: string;
  /**
   * `reels` — edge-to-edge short-form.
   * `viewer` — X-style centered video column (web + mobile).
   */
  variant?: "reels" | "viewer";
  /** Viewer only: click letterbox (outside video) to dismiss. */
  onBackgroundClick?: () => void;
  /** Notify parent when cinema (true fullscreen) mode toggles. */
  onCinemaChange?: (cinema: boolean) => void;
};

export function ReelsSlide({
  reel,
  index,
  activeIndex,
  muted,
  onMutedChange,
  onOpenMenu,
  onShare,
  disableLoop = false,
  onEnded,
  authCallbackPath,
  variant = "reels",
  onBackgroundClick,
  onCinemaChange,
}: Props) {
  const distance = Math.abs(index - activeIndex);
  const isActive = index === activeIndex;
  const like = useOptimisticLike(reel.postId, reel.liked, reel.likeCount);
  const star = useOptimisticStar(reel.postId, reel.starred);
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const router = useRouter();
  const isViewer = variant === "viewer";
  const [cinema, setCinema] = useState(false);
  const [showExitChrome, setShowExitChrome] = useState(true);
  const idleTimerRef = useRef<number | null>(null);

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    const callback =
      authCallbackPath ?? `/reels?v=${reel.postId}`;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
    return false;
  }

  const exitCinema = useCallback(() => {
    setCinema(false);
    onCinemaChange?.(false);
  }, [onCinemaChange]);

  const enterCinema = useCallback(() => {
    setCinema(true);
    setShowExitChrome(true);
    onCinemaChange?.(true);
  }, [onCinemaChange]);

  const toggleCinema = useCallback(() => {
    if (cinema) exitCinema();
    else enterCinema();
  }, [cinema, enterCinema, exitCinema]);

  // Leave cinema when this slide is no longer active.
  useEffect(() => {
    if (!isActive && cinema) exitCinema();
  }, [isActive, cinema, exitCinema]);

  // Idle → show X; any pointer move → briefly hide then show again after idle.
  useEffect(() => {
    if (!cinema || !isActive) return;

    const bump = () => {
      setShowExitChrome(true);
      if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setShowExitChrome(true); // keep X visible after idle (user asked for X popup when idle)
      }, CINEMA_IDLE_MS);
    };

    // Show X when idle (no recent interaction). Hide while actively moving/clicking.
    const onMove = () => {
      setShowExitChrome(false);
      if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setShowExitChrome(true);
      }, CINEMA_IDLE_MS);
    };

    const onDown = () => {
      setShowExitChrome(false);
      if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
    };

    const onUp = () => {
      if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setShowExitChrome(true);
      }, CINEMA_IDLE_MS);
    };

    bump();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      if (idleTimerRef.current != null) window.clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [cinema, isActive]);

  useEffect(() => {
    if (!cinema) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        exitCinema();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [cinema, exitCinema]);

  const caption =
    reel.title?.trim() ||
    reel.content.trim().slice(0, 160) ||
    `@${reel.author.username}`;

  const player = (
    <ReelsPlayer
      src={reel.media.url}
      hlsUrl={reel.media.hlsUrl}
      poster={reel.media.posterUrl}
      mediaId={reel.media.id}
      distance={distance}
      isActive={isActive}
      muted={muted}
      onMutedChange={onMutedChange}
      disableLoop={disableLoop}
      onEnded={onEnded}
      onDoubleTapLike={() => {
        if (!requireLogin()) return;
        void like.toggle();
      }}
      onLongPressMenu={onOpenMenu}
      onContextMenu={onOpenMenu}
    />
  );

  const captionBlock = !cinema ? (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent pt-24 pb-10">
      <div className="pointer-events-auto flex items-end justify-between gap-3 px-4 pr-16">
        <div className="min-w-0 max-w-[78%] space-y-1 text-white">
          <Link
            href={`/u/${reel.author.username}`}
            className="inline-block font-display text-sm font-bold drop-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded"
          >
            @{reel.author.username}
          </Link>
          <p className="text-sm leading-snug text-white/95 line-clamp-3 drop-shadow">
            {caption}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  const actions = (
    <ReelsActions
      reel={reel}
      liked={like.liked}
      likeCount={like.likeCount}
      starred={star.starred}
      onToggleLike={() => void like.toggle()}
      onToggleStar={() => void star.toggle()}
      muted={muted}
      onToggleMute={() => onMutedChange(!muted)}
      onShare={onShare}
      expanded={cinema}
      onToggleExpand={isViewer ? toggleCinema : undefined}
      className={cn(
        "absolute z-20",
        cinema
          ? "right-3 bottom-28 sm:right-5"
          : isViewer
            ? "right-2 bottom-28 sm:right-3 lg:right-[-3.75rem] lg:bottom-1/2 lg:translate-y-1/2"
            : "right-2 bottom-28 sm:right-4"
      )}
    />
  );

  return (
    <section
      data-reel-index={index}
      data-reel-id={reel.id}
      data-cinema={cinema ? "1" : "0"}
      className={cn(
        "relative h-[100dvh] w-full shrink-0 snap-start snap-always bg-black",
        isViewer && !cinema && "flex items-center justify-center",
        cinema && "z-[60]"
      )}
      aria-label={`Video by ${userDisplayName(reel.author)}`}
      onClick={
        isViewer && onBackgroundClick && !cinema
          ? (e) => {
              if (e.target === e.currentTarget) onBackgroundClick();
            }
          : undefined
      }
    >
      {isViewer ? (
        <div
          className={cn(
            "relative bg-black",
            cinema
              ? "fixed inset-0 z-[60] h-[100dvh] w-screen max-w-none"
              : "h-full w-full lg:h-[min(100dvh,920px)] lg:max-w-[420px]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {player}
          {captionBlock}
          {actions}

          {cinema && (
            <button
              type="button"
              onClick={exitCinema}
              className={cn(
                "pointer-events-auto absolute left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-30 -translate-x-1/2",
                "inline-flex h-10 w-10 items-center justify-center rounded-full",
                "bg-black/55 text-white shadow-lg backdrop-blur-md ring-1 ring-white/25",
                "transition-opacity duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                showExitChrome ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              aria-label="전체화면 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : (
        <>
          {player}
          {captionBlock}
          {actions}
        </>
      )}
    </section>
  );
}
