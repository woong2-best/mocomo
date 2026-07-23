"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Star } from "lucide-react";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PostRepostMenu } from "@/components/post/post-repost-menu";
import { PostViewCount } from "@/components/post/post-view-count";
import { PostViewTracker } from "@/components/post/post-view-tracker";
import { formatNumber, cn } from "@/lib/utils";
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";

export function PostDetailActions({
  postId,
  authorUsername,
  title,
  content,
  hasVideo = false,
  likeCount: initialLikeCount,
  commentCount,
  repostCount: initialRepostCount,
  viewCount: initialViewCount = 0,
  initialLiked = false,
  initialStarred = false,
  initialReposted = false,
}: {
  postId: string;
  authorUsername: string;
  title?: string | null;
  content?: string | null;
  hasVideo?: boolean;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewCount?: number;
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
}) {
  const like = useOptimisticLike(postId, initialLiked, initialLikeCount);
  const star = useOptimisticStar(postId, initialStarred);
  const [actionError, setActionError] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const { liked, likeCount } = like;
  const { starred } = star;
  const displayError = actionError || like.error || star.error;

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${postId}#comments`)}`);
    return false;
  }

  function handleLike() {
    if (!requireLogin()) return;
    setActionError("");
    void like.toggle();
  }

  function handleStar() {
    if (!requireLogin()) return;
    setActionError("");
    void star.toggle();
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1 min-h-9 px-1",
              liked ? "text-folk-terracotta" : "hover:text-folk-terracotta"
            )}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            <span>{formatNumber(likeCount)}</span>
          </button>
          <Link
            href={`/post/${postId}#comments`}
            className="flex items-center gap-1 hover:text-folk-cobalt min-h-9 px-1"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{formatNumber(commentCount)}</span>
          </Link>
          <PostRepostMenu
            postId={postId}
            authorUsername={authorUsername}
            title={title}
            content={content}
            initialReposted={initialReposted}
            repostCount={initialRepostCount}
            size="detail"
            requireLogin={requireLogin}
            onActionError={setActionError}
          />
          <PostShareMenu
            postId={postId}
            authorUsername={authorUsername}
            title={title}
            content={content}
            hasVideo={hasVideo}
            size="detail"
            onActionError={setActionError}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <PostViewTracker postId={postId} initialCount={initialViewCount}>
            {(views) => <PostViewCount count={views} size="detail" />}
          </PostViewTracker>
          <button
            type="button"
            onClick={handleStar}
            aria-label={starred ? "STAR에서 제거" : "STAR에 저장"}
            className={cn(
              "min-h-9 min-w-9 flex items-center justify-center",
              starred ? "text-yellow-400" : "text-yellow-500/70 hover:text-yellow-400"
            )}
          >
            <Star className={cn("h-5 w-5", starred && "fill-yellow-400 text-yellow-400")} />
          </button>
        </div>
      </div>
      {displayError && <p className="mt-2 text-xs text-destructive">{displayError}</p>}
    </div>
  );
}
