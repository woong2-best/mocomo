"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Share2, Star, Repeat2 } from "lucide-react";
import { repost } from "@/actions/social";
import { formatNumber, cn } from "@/lib/utils";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import { toggleLike } from "@/actions/social";
import { toggleBookmark } from "@/actions/community";
import type { GridPost } from "@/components/feed/feed-post-card";

const typeLabels: Record<string, string> = {
  COSPLAY: "코스프레",
  FANART: "팬아트",
  REVIEW: "리뷰",
  MEME: "밈",
  NEWS: "뉴스",
  PHOTO: "사진",
  VIDEO: "영상",
};

export function FeedPostCardInteractive({
  post,
  initialLiked = false,
  initialStarred = false,
}: {
  post: GridPost & { createdAt: string | Date };
  initialLiked?: boolean;
  initialStarred?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [starred, setStarred] = useState(initialStarred);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post._count?.reposts ?? 0);
  const [pending, startTransition] = useTransition();
  const { data: session } = useSession();
  const router = useRouter();

  function requireLogin(callbackUrl: string) {
    if (session?.user) return true;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    return false;
  }

  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const displayName = userDisplayName(post.author);
  const cover = post.media?.[0]?.url;

  function handleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin(`/post/${post.id}`)) return;
    startTransition(async () => {
      try {
        const res = await toggleLike(post.id);
        setLiked(res.liked);
        setLikeCount((c) => (res.liked ? c + 1 : Math.max(0, c - 1)));
      } catch {
        /* auth/session */
      }
    });
  }

  function handleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin(`/post/${post.id}`)) return;
    startTransition(async () => {
      try {
        const res = await toggleBookmark(post.id);
        setStarred(res.bookmarked);
        if (!res.bookmarked && window.location.pathname.startsWith("/star")) {
          router.refresh();
        }
      } catch {
        /* auth/session */
      }
    });
  }

  function handleRepost(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin(`/post/${post.id}`)) return;
    startTransition(async () => {
      try {
        const res = await repost(post.id);
        setReposted(res.reposted);
        setRepostCount((c) => (res.reposted ? c + 1 : Math.max(0, c - 1)));
      } catch {
        /* auth/session */
      }
    });
  }

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: post.title || "Aa", url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-200 group h-full flex flex-col">
      <CardContent className="p-0 flex flex-col flex-1">
        <div className="flex items-center gap-2 p-3 pb-2">
          <Link href={`/u/${post.author.username}`}>
            <Avatar className="h-8 w-8 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
              <AvatarImage src={post.author.image} />
              <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/u/${post.author.username}`} className="hover:text-primary block min-w-0">
              <DisplayNameWithSupportTier
                name={displayName}
                tier={post.author.supportTierSent ?? "PEBBLE"}
                nameClassName="font-semibold text-sm"
                compact
              />
            </Link>
            <div className="flex items-center gap-1.5 flex-wrap">
              {post.postType && post.postType !== "GENERAL" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {typeLabels[post.postType] || post.postType}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatDistanceToNow(createdAt, { addSuffix: true, locale: ko })}
          </span>
        </div>

        <Link href={`/post/${post.id}`} className="block flex-1">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="w-full aspect-[4/5] object-cover" loading="lazy" />
          ) : (
            <div className="px-3 pb-3">
              {post.title && <h3 className="font-semibold text-sm mb-1">{post.title}</h3>}
              <p className="text-sm text-foreground/85 line-clamp-6">{post.content}</p>
            </div>
          )}
        </Link>

        {post.anime && (
          <Link href={`/anime/${post.anime.slug}`} className="px-3 text-xs text-[#5e35b1] hover:underline">
            {post.anime.title}
          </Link>
        )}

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/40 text-muted-foreground">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={pending}
              onClick={handleLike}
              className={cn(
                "flex items-center gap-0.5 transition-colors",
                liked ? "text-[#e53935]" : "hover:text-[#e53935]"
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
              {formatNumber(likeCount)}
            </button>
            <Link href={`/post/${post.id}#comments`} className="flex items-center gap-0.5 hover:text-[#1e88e5]">
              <MessageCircle className="h-3.5 w-3.5" />
              {formatNumber(post._count?.comments ?? 0)}
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={handleRepost}
              className={cn(
                "flex items-center gap-0.5",
                reposted ? "text-green-600" : "hover:text-green-600"
              )}
            >
              <Repeat2 className="h-3.5 w-3.5" />
              {formatNumber(repostCount)}
            </button>
            <button type="button" onClick={handleShare} className="hover:text-foreground">
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={handleStar}
            aria-label={starred ? "STAR에서 제거" : "STAR에 저장"}
            title={starred ? "STAR에 저장됨" : "STAR에 저장"}
            className={cn(
              "transition-colors",
              starred ? "text-yellow-400" : "text-yellow-500/70 hover:text-yellow-400"
            )}
          >
            <Star className={cn("h-4 w-4", starred && "fill-yellow-400 text-yellow-400")} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
