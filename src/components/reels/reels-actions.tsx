"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  Maximize2,
  MessageSquare,
  Minimize2,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ShareGlobeIcon } from "@/components/ui/share-globe-icon";
import { cn, formatNumber } from "@/lib/utils";
import { prefetchPostComments } from "@/lib/comments-prefetch-cache";
import { MotionPop } from "@/components/motion/motion-primitives";
import type { ReelItem } from "@/lib/reels/types";

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
  /** Open in-viewer comments panel (YouTube-style). */
  onComment?: () => void;
  /** Override displayed comment count (live updates). */
  commentCount?: number;
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
  onComment,
  commentCount,
  className,
}: Props) {
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const router = useRouter();
  const displayCommentCount = commentCount ?? reel.commentCount;

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

      {onComment ? (
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 min-h-11 min-w-11"
          aria-label="Comments"
          onPointerDown={() => prefetchPostComments(reel.postId)}
          onClick={onComment}
        >
          <MessageSquare className="h-7 w-7 drop-shadow-md" />
          <span className="text-[11px] font-semibold tabular-nums drop-shadow">
            {formatNumber(displayCommentCount)}
          </span>
        </button>
      ) : (
        <Link
          href={`/post/${reel.postId}#comments`}
          className="flex flex-col items-center gap-0.5 min-h-11 min-w-11"
          aria-label="Comments"
        >
          <MessageSquare className="h-7 w-7 drop-shadow-md" />
          <span className="text-[11px] font-semibold tabular-nums drop-shadow">
            {formatNumber(displayCommentCount)}
          </span>
        </Link>
      )}

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
      </button>

      <button
        type="button"
        className="flex flex-col items-center gap-0.5 min-h-11 min-w-11"
        aria-label="Share"
        onClick={onShare}
      >
        <ShareGlobeIcon className="h-7 w-7 drop-shadow-md" />
      </button>

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
        </button>
      )}
    </div>
  );
}
