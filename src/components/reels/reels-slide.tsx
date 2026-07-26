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
};

export function ReelsSlide({
  reel,
  index,
  activeIndex,
  muted,
  onMutedChange,
  onOpenMenu,
  onShare,
}: Props) {
  const distance = Math.abs(index - activeIndex);
  const isActive = index === activeIndex;
  const like = useOptimisticLike(reel.postId, reel.liked, reel.likeCount);
  const star = useOptimisticStar(reel.postId, reel.starred);
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const router = useRouter();

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/reels?v=${reel.postId}`)}`);
    return false;
  }

  const caption =
    reel.title?.trim() ||
    reel.content.trim().slice(0, 160) ||
    `@${reel.author.username}`;

  return (
    <section
      data-reel-index={index}
      data-reel-id={reel.id}
      className={cn(
        "relative h-[100dvh] w-full shrink-0 snap-start snap-always",
        "bg-black"
      )}
      aria-label={`Video by ${userDisplayName(reel.author)}`}
    >
      <ReelsPlayer
        src={reel.media.url}
        hlsUrl={reel.media.hlsUrl}
        poster={reel.media.posterUrl}
        mediaId={reel.media.id}
        distance={distance}
        isActive={isActive}
        muted={muted}
        onMutedChange={onMutedChange}
        onDoubleTapLike={() => {
          if (!requireLogin()) return;
          void like.toggle();
        }}
        onLongPressMenu={onOpenMenu}
        onContextMenu={onOpenMenu}
      />

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
        className="absolute right-2 bottom-28 z-20 sm:right-4"
      />
    </section>
  );
}
