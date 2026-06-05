"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompactNumberKo, formatFeedRelativeTime } from "@/lib/format-feed";
import type { GridPost } from "@/components/feed/feed-post-card";
import { engageStar, postEngage } from "@/lib/post-engage-client";

const CAPTION_PREVIEW_LEN = 80;

export function FeedPhotoPostCard({
  post,
  initialLiked = false,
  initialStarred = false,
  initialReposted = false,
}: {
  post: GridPost & { createdAt: string | Date };
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [starred, setStarred] = useState(initialStarred);
  const [reposted, setReposted] = useState(initialReposted);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [repostCount, setRepostCount] = useState(post._count?.reposts ?? 0);
  const [busy, setBusy] = useState<"like" | "repost" | "star" | null>(null);
  const [shareDone, setShareDone] = useState(false);
  const [actionError, setActionError] = useState("");
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const username = post.author.username;
  const media = post.media ?? [];
  const caption = [post.title, post.content].filter(Boolean).join("\n").trim();
  const captionLong = caption.length > CAPTION_PREVIEW_LEN;
  const captionPreview =
    captionLong && !captionExpanded ? `${caption.slice(0, CAPTION_PREVIEW_LEN).trim()}…` : caption;

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${post.id}`)}`);
    return false;
  }

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin() || busy) return;
    setActionError("");
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    setBusy("like");
    try {
      const data = await postEngage(post.id, "like");
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

  async function handleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin() || busy) return;
    setActionError("");
    const prev = starred;
    setStarred(!starred);
    setBusy("star");
    try {
      const starredNow = await engageStar(post.id);
      setStarred(starredNow);
    } catch (err) {
      setStarred(prev);
      setActionError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRepost(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin() || busy) return;
    setActionError("");
    const prevReposted = reposted;
    const prevCount = repostCount;
    setReposted(!reposted);
    setRepostCount((c) => (reposted ? Math.max(0, c - 1) : c + 1));
    setBusy("repost");
    try {
      const data = await postEngage(post.id, "repost");
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

  async function handleSend(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActionError("");
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: caption.slice(0, 40) || username, url });
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
    <article className="border-b border-border bg-background">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <Link href={`/u/${username}`} className="shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.author.image ?? undefined} />
            <AvatarFallback className="text-xs">{username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-1 text-sm">
          <Link href={`/u/${username}`} className="font-semibold truncate hover:opacity-80">
            {username}
          </Link>
          <span className="text-muted-foreground shrink-0">·</span>
          <time className="text-muted-foreground shrink-0" dateTime={createdAt.toISOString()}>
            {formatFeedRelativeTime(createdAt)}
          </time>
          {post.isNsfw && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-destructive/20 text-destructive shrink-0">
              NSFW
            </span>
          )}
        </div>
        <Link
          href={`/post/${post.id}`}
          className="p-2 -mr-1 text-foreground hover:opacity-70"
          aria-label="게시글 더보기"
        >
          <MoreHorizontal className="h-5 w-5" />
        </Link>
      </header>

      <Link href={`/post/${post.id}`} className="block px-3">
        <div className="relative rounded-lg overflow-hidden bg-black/90 aspect-square">
          {media.length > 1 && (
            <span className="absolute top-2 right-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white">
              1/{media.length}
            </span>
          )}
          {media[0]?.type === "VIDEO" ? (
            <video
              src={media[0].url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media[0]?.url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
      </Link>

      {post.anime && (
        <Link
          href={`/anime/${post.anime.slug}`}
          className="block px-3 pt-2 text-xs text-primary hover:underline"
        >
          {post.anime.title}
        </Link>
      )}

      <div className="px-3 pt-2.5 pb-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy === "like"}
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 min-h-9 transition-colors",
                liked ? "text-[#ff3040]" : "hover:opacity-70"
              )}
              aria-label="좋아요"
            >
              <Heart className={cn("h-6 w-6", liked && "fill-current")} strokeWidth={1.5} />
              {likeCount > 0 && (
                <span className="text-sm font-medium tabular-nums">
                  {formatCompactNumberKo(likeCount)}
                </span>
              )}
            </button>
            <Link
              href={`/post/${post.id}#comments`}
              className="flex items-center gap-1.5 min-h-9 hover:opacity-70"
            >
              <MessageCircle className="h-6 w-6" strokeWidth={1.5} />
              {(post._count?.comments ?? 0) > 0 && (
                <span className="text-sm font-medium tabular-nums">
                  {formatCompactNumberKo(post._count?.comments ?? 0)}
                </span>
              )}
            </Link>
            <button
              type="button"
              disabled={busy === "repost"}
              onClick={handleRepost}
              className={cn(
                "flex items-center gap-1.5 min-h-9 hover:opacity-70",
                reposted && "text-green-500"
              )}
              aria-label="리포스트"
            >
              <Repeat2 className="h-6 w-6" strokeWidth={1.5} />
              {repostCount > 0 && (
                <span className="text-sm font-medium tabular-nums">
                  {formatCompactNumberKo(repostCount)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="min-h-9 hover:opacity-70"
              aria-label={shareDone ? "링크 복사됨" : "공유"}
            >
              {shareDone ? (
                <Check className="h-6 w-6 text-green-500" strokeWidth={1.5} />
              ) : (
                <Send className="h-6 w-6" strokeWidth={1.5} />
              )}
            </button>
          </div>
          <button
            type="button"
            disabled={busy === "star"}
            onClick={handleStar}
            className="min-h-9 hover:opacity-70"
            aria-label={starred ? "STAR에서 제거" : "STAR에 저장"}
          >
            <Bookmark
              className={cn("h-6 w-6", starred && "fill-current text-foreground")}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {caption && (
        <div className="px-3 pb-3 text-sm leading-snug">
          <p className="whitespace-pre-wrap break-words">
            <Link href={`/u/${username}`} className="font-semibold mr-1.5 hover:opacity-80">
              {username}
            </Link>
            <span>{captionPreview}</span>
            {captionLong && !captionExpanded && (
              <button
                type="button"
                className="text-muted-foreground ml-1 hover:text-foreground"
                onClick={() => setCaptionExpanded(true)}
              >
                더 보기
              </button>
            )}
          </p>
        </div>
      )}

      {actionError && <p className="px-3 pb-2 text-xs text-destructive">{actionError}</p>}
    </article>
  );
}
