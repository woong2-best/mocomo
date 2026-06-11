"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Star } from "lucide-react";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PostRepostMenu } from "@/components/post/post-repost-menu";
import { formatNumber, cn } from "@/lib/utils";
import { engageStar, postEngage } from "@/lib/post-engage-client";

export function PostDetailActions({
  postId,
  authorUsername,
  title,
  content,
  hasVideo = false,
  likeCount: initialLikeCount,
  commentCount,
  repostCount: initialRepostCount,
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
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [starred, setStarred] = useState(initialStarred);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState<"like" | "star" | null>(null);
  const [actionError, setActionError] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${postId}#comments`)}`);
    return false;
  }

  async function handleLike() {
    if (!requireLogin() || busy) return;
    setActionError("");
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    setBusy("like");
    try {
      const data = await postEngage(postId, "like");
      setLiked(!!data.liked);
      if (typeof data.likeCount === "number") setLikeCount(data.likeCount);
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      setActionError(err instanceof Error ? err.message : "좋아요에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleStar() {
    if (!requireLogin() || busy) return;
    setActionError("");
    const prev = starred;
    setStarred(!starred);
    setBusy("star");
    try {
      const starredNow = await engageStar(postId);
      setStarred(starredNow);
    } catch (err) {
      setStarred(prev);
      setActionError(err instanceof Error ? err.message : "STAR 저장에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            disabled={busy === "like"}
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
        <button
          type="button"
          disabled={busy === "star"}
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
      {actionError && <p className="mt-2 text-xs text-destructive">{actionError}</p>}
    </div>
  );
}
