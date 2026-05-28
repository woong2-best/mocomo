"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Star, Repeat2, Check } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";

async function postEngage(postId: string, action: "like" | "repost" | "star") {
  const res = await fetch(`/api/posts/${postId}/${action}`, {
    method: "POST",
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "요청에 실패했습니다.");
  }
  return body as Record<string, unknown>;
}

export function PostDetailActions({
  postId,
  likeCount: initialLikeCount,
  commentCount,
  repostCount: initialRepostCount,
  initialLiked = false,
  initialStarred = false,
  initialReposted = false,
}: {
  postId: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [starred, setStarred] = useState(initialStarred);
  const [reposted, setReposted] = useState(initialReposted);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [repostCount, setRepostCount] = useState(initialRepostCount);
  const [busy, setBusy] = useState<"like" | "repost" | "star" | null>(null);
  const [shareDone, setShareDone] = useState(false);
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
      const data = await postEngage(postId, "star");
      setStarred(!!data.starred);
    } catch (err) {
      setStarred(prev);
      setActionError(err instanceof Error ? err.message : "STAR 저장에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRepost() {
    if (!requireLogin() || busy) return;
    setActionError("");
    const prevReposted = reposted;
    const prevCount = repostCount;
    setReposted(!reposted);
    setRepostCount((c) => (reposted ? Math.max(0, c - 1) : c + 1));
    setBusy("repost");
    try {
      const data = await postEngage(postId, "repost");
      setReposted(!!data.reposted);
      if (typeof data.repostCount === "number") setRepostCount(data.repostCount);
    } catch (err) {
      setReposted(prevReposted);
      setRepostCount(prevCount);
      setActionError(err instanceof Error ? err.message : "리포스트에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setActionError("");
    const url = `${window.location.origin}/post/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareDone(true);
        window.setTimeout(() => setShareDone(false), 2000);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setActionError("공유에 실패했습니다.");
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
              liked ? "text-[#e53935]" : "hover:text-[#e53935]"
            )}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            <span>{formatNumber(likeCount)}</span>
          </button>
          <Link
            href={`/post/${postId}#comments`}
            className="flex items-center gap-1 hover:text-[#1e88e5] min-h-9 px-1"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{formatNumber(commentCount)}</span>
          </Link>
          <button
            type="button"
            disabled={busy === "repost"}
            onClick={handleRepost}
            className={cn(
              "flex items-center gap-1 min-h-9 px-1",
              reposted ? "text-green-600" : "hover:text-green-600"
            )}
          >
            <Repeat2 className="h-4 w-4" />
            <span>{formatNumber(repostCount)}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="hover:text-foreground min-h-9 px-1"
            title={shareDone ? "링크 복사됨" : "공유"}
          >
            {shareDone ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </button>
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
