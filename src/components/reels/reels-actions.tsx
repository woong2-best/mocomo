"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  Maximize2,
  MessageCircle,
  Minimize2,
  Share2,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { MotionPop } from "@/components/motion/motion-primitives";
import { userDisplayName } from "@/lib/user-public-select";
import type { ReelItem } from "@/lib/reels/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  reel: ReelItem;
  liked: boolean;
  likeCount: number;
  starred: boolean;
  onToggleLike: () => void;
  onToggleStar: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onShare: () => void;
  /** Immersive cinema / fullscreen within the viewer. */
  expanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
};

export function ReelsActions({
  reel,
  liked,
  likeCount,
  starred,
  onToggleLike,
  onToggleStar,
  muted,
  onToggleMute,
  onShare,
  expanded = false,
  onToggleExpand,
  className,
}: Props) {
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

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col items-center gap-4 text-white",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {!expanded && (
        <Link
          href={`/u/${reel.author.username}`}
          className="relative mb-1 rounded-full ring-2 ring-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-folk-gold"
          aria-label={`@${reel.author.username}`}
        >
          <Avatar className="h-11 w-11 border border-white/30">
            <AvatarImage src={reel.author.image ?? undefined} alt="" />
            <AvatarFallback className="bg-folk-cobalt text-white text-sm">
              {userDisplayName(reel.author).slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}

      <button
        type="button"
        className="flex flex-col items-center gap-0.5 min-h-11 min-w-11"
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        onClick={() => {
          if (!requireLogin()) return;
          onToggleLike();
        }}
      >
        <MotionPop trigger={liked}>
          <Heart
            className={cn(
              "h-7 w-7 drop-shadow-md",
              liked && "fill-folk-terracotta text-folk-terracotta"
            )}
          />
        </MotionPop>
        <span className="text-[11px] font-semibold tabular-nums drop-shadow">
          {formatNumber(likeCount)}
        </span>
      </button>

      {!expanded && (
        <Link
          href={`/post/${reel.postId}#comments`}
          className="flex flex-col items-center gap-0.5 min-h-11 min-w-11"
          aria-label="Comments"
        >
          <MessageCircle className="h-7 w-7 drop-shadow-md" />
          <span className="text-[11px] font-semibold tabular-nums drop-shadow">
            {formatNumber(reel.commentCount)}
          </span>
        </Link>
      )}

      {!expanded && (
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 min-h-11 min-w-11"
          aria-pressed={starred}
          aria-label={starred ? "Remove bookmark" : "Bookmark"}
          onClick={() => {
            if (!requireLogin()) return;
            onToggleStar();
          }}
        >
          <MotionPop trigger={starred}>
            <Star
              className={cn(
                "h-7 w-7 drop-shadow-md",
                starred && "fill-folk-gold text-folk-gold"
              )}
            />
          </MotionPop>
          <span className="text-[11px] font-semibold drop-shadow">저장</span>
        </button>
      )}

      {!expanded && (
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 min-h-11 min-w-11"
          aria-label="Share"
          onClick={onShare}
        >
          <Share2 className="h-7 w-7 drop-shadow-md" />
          <span className="text-[11px] font-semibold drop-shadow">공유</span>
        </button>
      )}

      <button
        type="button"
        className="mt-1 flex flex-col items-center gap-0.5 min-h-11 min-w-11"
        aria-pressed={!muted}
        aria-label={muted ? "Unmute" : "Mute"}
        onClick={onToggleMute}
      >
        {muted ? (
          <VolumeX className="h-7 w-7 drop-shadow-md" />
        ) : (
          <Volume2 className="h-7 w-7 drop-shadow-md" />
        )}
      </button>

      {onToggleExpand && (
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 min-h-11 min-w-11"
          aria-pressed={expanded}
          aria-label={expanded ? "전체화면 종료" : "전체화면"}
          onClick={onToggleExpand}
        >
          {expanded ? (
            <Minimize2 className="h-7 w-7 drop-shadow-md" />
          ) : (
            <Maximize2 className="h-7 w-7 drop-shadow-md" />
          )}
          <span className="text-[11px] font-semibold drop-shadow">
            {expanded ? "축소" : "확대"}
          </span>
        </button>
      )}
    </div>
  );
}
