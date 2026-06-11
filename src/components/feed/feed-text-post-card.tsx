"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Star, Repeat2 } from "lucide-react";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { formatNumber, cn } from "@/lib/utils";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { GridPost } from "@/components/feed/feed-post-card";
import { PostPollCard } from "@/components/post/post-poll-card";
import { engageStar, postEngage } from "@/lib/post-engage-client";

const typeLabels: Record<string, string> = {
  COSPLAY: "코스프레",
  FANART: "팬아트",
  REVIEW: "리뷰",
  MEME: "밈",
  NEWS: "뉴스",
  PHOTO: "사진",
  VIDEO: "영상",
};

export function FeedTextPostCard({
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
  const [actionError, setActionError] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();

  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const displayName = userDisplayName(post.author);

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
      setActionError(err instanceof Error ? err.message : "STAR 저장에 실패했습니다.");
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

  return (
    <Card className="folk-post-card group w-full">
      <CardContent className="p-0 flex flex-col">
        <div className="flex items-center gap-2 p-3 pb-2">
          <Link href={`/u/${post.author.username}`} onClick={(e) => e.stopPropagation()}>
            <Avatar className="h-8 w-8 ring-2 ring-folk-gold/50 group-hover:ring-folk-terracotta/60 transition-all border-2 border-folk-cobalt/20">
              <AvatarImage src={post.author.image ?? undefined} />
              <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={`/u/${post.author.username}`}
              className="hover:text-primary block min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <DisplayNameWithSupportTier
                name={displayName}
                tier={post.author.supportTierSent ?? "PEBBLE"}
                nameClassName="font-semibold text-sm"
                compact
              />
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap">
              {post.postType && post.postType !== "GENERAL" && (
                <span className="folk-tag">
                  {typeLabels[post.postType] || post.postType}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatDistanceToNow(createdAt, { addSuffix: true, locale: ko })}
          </span>
        </div>

        <Link href={`/post/${post.id}`} className="block flex-1 px-3 pb-3">
          {post.title && (
            <h3 className="font-display font-bold text-sm mb-1 text-folk-cobalt">{post.title}</h3>
          )}
          <p className="text-sm text-foreground/85 line-clamp-6 whitespace-pre-wrap">{post.content}</p>
        </Link>

        {post.poll && (
          <PostPollCard postId={post.id} poll={post.poll} compact />
        )}

        {post.anime && (
          <Link
            href={`/anime/${post.anime.slug}`}
            className="px-3 text-xs text-folk-cobalt font-semibold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {post.anime.title}
          </Link>
        )}

        <div
          className="relative z-20 flex items-center justify-between px-3 py-2.5 border-t-2 border-folk-cobalt/15 text-muted-foreground bg-folk-gold/5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={busy === "like"}
              onClick={handleLike}
              className={cn(
                "flex items-center gap-0.5 transition-colors min-h-8 min-w-8 justify-center",
                liked ? "text-folk-terracotta" : "hover:text-folk-terracotta"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5 pointer-events-none", liked && "fill-current")} />
              <span className="pointer-events-none">{formatNumber(likeCount)}</span>
            </button>
            <Link
              href={`/post/${post.id}#comments`}
              className="flex items-center gap-0.5 hover:text-folk-cobalt min-h-8 px-1"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{formatNumber(post._count?.comments ?? 0)}</span>
            </Link>
            <button
              type="button"
              disabled={busy === "repost"}
              onClick={handleRepost}
              className={cn(
                "flex items-center gap-0.5 min-h-8 min-w-8 justify-center",
                reposted ? "text-folk-forest" : "hover:text-folk-forest"
              )}
            >
              <Repeat2 className="h-3.5 w-3.5 pointer-events-none" />
              <span className="pointer-events-none">{formatNumber(repostCount)}</span>
            </button>
            <PostShareMenu
              postId={post.id}
              authorUsername={post.author.username}
              title={post.title}
              content={post.content}
              hasVideo={post.media?.some((m) => m.type === "VIDEO")}
              onActionError={setActionError}
            />
          </div>
          <button
            type="button"
            disabled={busy === "star"}
            onClick={handleStar}
            aria-label={starred ? "STAR에서 제거" : "STAR에 저장"}
            title={starred ? "STAR에 저장됨" : "STAR에 저장"}
            className={cn(
              "transition-colors min-h-8 min-w-8 flex items-center justify-center",
              starred ? "text-folk-gold" : "text-folk-gold/60 hover:text-folk-gold"
            )}
          >
            <Star
              className={cn(
                "h-4 w-4 pointer-events-none",
                starred && "fill-folk-gold text-folk-gold"
              )}
            />
          </button>
        </div>
        {actionError && (
          <p className="px-3 pb-2 text-[10px] text-destructive">{actionError}</p>
        )}
      </CardContent>
    </Card>
  );
}
