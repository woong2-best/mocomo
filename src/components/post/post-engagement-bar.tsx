"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { ReplyBubbleIcon } from "@/components/icons/reply-bubble-icon";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PostRepostMenu } from "@/components/post/post-repost-menu";
import { PostViewCount } from "@/components/post/post-view-count";
import { PostViewTracker } from "@/components/post/post-view-tracker";
import { formatNumber, cn } from "@/lib/utils";
import { MotionPop } from "@/components/motion/motion-primitives";
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";

export function PostEngagementBar({
  postId,
  authorUsername,
  title,
  content,
  hasVideo = false,
  likeCount: initialLikeCount,
  commentCount,
  repostCount = 0,
  viewCount = 0,
  initialLiked = false,
  initialStarred = false,
  initialReposted = false,
  className,
  trackViewsWhenVisible = true,
}: {
  postId: string;
  authorUsername: string;
  title?: string | null;
  content?: string | null;
  hasVideo?: boolean;
  likeCount: number;
  commentCount: number;
  repostCount?: number;
  viewCount?: number;
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
  className?: string;
  trackViewsWhenVisible?: boolean;
}) {
  const like = useOptimisticLike(postId, initialLiked, initialLikeCount);
  const star = useOptimisticStar(postId, initialStarred);
  const [actionError, setActionError] = useState("");
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const router = useRouter();
  const { liked, likeCount } = like;
  const { starred } = star;
  const displayError = actionError || like.error || star.error;

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${postId}`)}`);
    return false;
  }

  function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin()) return;
    setActionError("");
    void like.toggle();
  }

  function handleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin()) return;
    setActionError("");
    void star.toggle();
  }

  return (
    <div className={cn("space-y-1", className)} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1 transition-colors min-h-8 px-2 rounded-lg",
              liked ? "text-folk-terracotta" : "hover:text-folk-terracotta hover:bg-muted/50"
            )}
          >
            <MotionPop trigger={liked}>
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            </MotionPop>
            <span>{formatNumber(likeCount)}</span>
          </button>
          <Link
            href={`/post/${postId}#comments`}
            className="flex items-center gap-1 hover:text-folk-cobalt min-h-8 px-2 rounded-lg hover:bg-muted/50"
          >
            <ReplyBubbleIcon className="h-4 w-4" />
            <span>{formatNumber(commentCount)}</span>
          </Link>
          <PostRepostMenu
            postId={postId}
            authorUsername={authorUsername}
            title={title}
            content={content}
            initialReposted={initialReposted}
            repostCount={repostCount}
            requireLogin={requireLogin}
            onActionError={setActionError}
          />
          <PostShareMenu
            postId={postId}
            authorUsername={authorUsername}
            title={title}
            content={content}
            hasVideo={hasVideo}
            onActionError={setActionError}
          />
        </div>
        <div className="flex items-center gap-2">
          <PostViewTracker
            postId={postId}
            initialCount={viewCount}
            whenVisible={trackViewsWhenVisible}
          >
            {(views) => <PostViewCount count={views} />}
          </PostViewTracker>
          <button
            type="button"
            onClick={handleStar}
            aria-label={starred ? "STAR에서 제거" : "STAR에 저장"}
            className={cn(
              "transition-colors min-h-8 min-w-8 flex items-center justify-center rounded-lg",
              starred ? "text-folk-gold" : "text-folk-gold/60 hover:text-folk-gold hover:bg-muted/50"
            )}
          >
            <MotionPop trigger={starred}>
              <Star className={cn("h-4 w-4", starred && "fill-folk-gold text-folk-gold")} />
            </MotionPop>
          </button>
        </div>
      </div>
      {displayError && <p className="text-xs text-destructive">{displayError}</p>}
    </div>
  );
}
