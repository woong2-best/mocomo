"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";
import { userDisplayName } from "@/lib/user-public-select";
import type { ReelItem } from "@/lib/reels/types";
import { ReelsPlayer } from "@/components/reels/reels-player";
import { ReelsActions } from "@/components/reels/reels-actions";
import { cn } from "@/lib/utils";

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

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    const callback =
      authCallbackPath ?? `/reels?v=${reel.postId}`;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`);
    return false;
  }

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

  const captionBlock = (
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
  );

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
      className={cn(
        "absolute z-20",
        isViewer
          ? "right-2 bottom-28 sm:right-3 lg:right-[-3.75rem] lg:bottom-1/2 lg:translate-y-1/2"
          : "right-2 bottom-28 sm:right-4"
      )}
    />
  );

  return (
    <section
      data-reel-index={index}
      data-reel-id={reel.id}
      className={cn(
        "relative h-[100dvh] w-full shrink-0 snap-start snap-always bg-black",
        isViewer && "flex items-center justify-center"
      )}
      aria-label={`Video by ${userDisplayName(reel.author)}`}
      onClick={
        isViewer && onBackgroundClick
          ? (e) => {
              if (e.target === e.currentTarget) onBackgroundClick();
            }
          : undefined
      }
    >
      {isViewer ? (
        <div
          className="relative h-full w-full max-w-[min(100vw,560px)] lg:h-[min(100dvh,920px)] lg:max-w-[420px]"
          onClick={(e) => e.stopPropagation()}
        >
          {player}
          {captionBlock}
          {actions}
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
