"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Bookmark,
} from "lucide-react";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PostRepostMenu } from "@/components/post/post-repost-menu";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { cn } from "@/lib/utils";
import { formatCompactNumberKo, formatFeedRelativeTime } from "@/lib/format-feed";
import type { GridPost } from "@/components/feed/feed-post-card";
import { PostPollCard } from "@/components/post/post-poll-card";
import { MotionPop } from "@/components/motion/motion-primitives";
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";
import { TranslatableText } from "@/components/ui/translatable-text";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import { LockedMediaPaywallOverlay } from "@/components/media/locked-media-paywall-overlay";

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
  const like = useOptimisticLike(post.id, initialLiked, post._count?.likes ?? 0);
  const star = useOptimisticStar(post.id, initialStarred);
  const [actionError, setActionError] = useState("");
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const username = post.author.username;
  const media = post.media ?? [];
  const isOwner = session?.user?.id === post.author.id;
  const caption = [post.title, post.content].filter(Boolean).join("\n").trim();
  const captionLong = caption.length > CAPTION_PREVIEW_LEN;
  const captionPreview =
    captionLong && !captionExpanded ? `${caption.slice(0, CAPTION_PREVIEW_LEN).trim()}…` : caption;
  const { liked, likeCount } = like;
  const { starred } = star;
  const displayError = actionError || like.error || star.error;

  function requireLogin() {
    if (status === "loading") return false;
    if (session?.user) return true;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${post.id}`)}`);
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
        <PostOwnerMenu
          postId={post.id}
          isPinned={post.isPinned}
          isOwner={isOwner}
          authorId={post.author.id}
          authorUsername={post.author.username}
          size="md"
        />
      </header>

      {media[0]?.type === "VIDEO" ? (
        <div className="px-3">
          <div className="relative rounded-lg overflow-hidden bg-black/90 aspect-square group/media">
            {media.length > 1 && (
              <span className="absolute top-2 right-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white">
                1/{media.length}
              </span>
            )}
            <ProtectedPaidMedia
              type={media[0].type}
              src={media[0].url}
              className={cn(
                "w-full h-full object-cover",
                media[0].locked && "blur-xl scale-105"
              )}
              mediaPriceKrw={media[0].priceKrw}
              postInstantPurchasePriceKrw={post.instantPurchasePriceKrw}
              locked={media[0].locked}
            />
            {media[0].locked && (
              <LockedMediaPaywallOverlay label="결제하기" />
            )}
          </div>
        </div>
      ) : (
        <Link href={`/post/${post.id}`} className="block px-3">
          <div className="relative rounded-lg overflow-hidden bg-black/90 aspect-square group/media">
            {media.length > 1 && (
              <span className="absolute top-2 right-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[11px] text-white">
                1/{media.length}
              </span>
            )}
            {media[0] ? (
              <>
                <ProtectedPaidMedia
                  type={media[0].type}
                  src={media[0].url}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-500 ease-out group-hover/media:scale-[1.04]",
                    media[0].locked && "blur-xl scale-105"
                  )}
                  mediaPriceKrw={media[0].priceKrw}
                  postInstantPurchasePriceKrw={post.instantPurchasePriceKrw}
                  locked={media[0].locked}
                />
                {media[0].locked && <LockedMediaPaywallOverlay label="결제하기" />}
              </>
            ) : null}
          </div>
        </Link>
      )}

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
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 min-h-9 transition-colors",
                liked ? "text-[#ff3040]" : "hover:opacity-70"
              )}
              aria-label="좋아요"
            >
              <MotionPop trigger={liked}>
                <Heart className={cn("h-6 w-6", liked && "fill-current")} strokeWidth={1.5} />
              </MotionPop>
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
            <PostRepostMenu
              postId={post.id}
              authorUsername={username}
              title={post.title}
              content={post.content}
              initialReposted={initialReposted}
              repostCount={post._count?.reposts ?? 0}
              size="md"
              tone="plain"
              requireLogin={requireLogin}
              onActionError={setActionError}
              formatCount={formatCompactNumberKo}
            />
            <PostShareMenu
              postId={post.id}
              authorUsername={username}
              title={post.title}
              content={post.content}
              hasVideo={media.some((m) => m.type === "VIDEO")}
              size="md"
              tone="plain"
              onActionError={setActionError}
            />
          </div>
          <button
            type="button"
            onClick={handleStar}
            className="min-h-9 hover:opacity-70"
            aria-label={starred ? "STAR에서 제거" : "STAR에 저장"}
          >
            <MotionPop trigger={starred}>
              <Bookmark
                className={cn("h-6 w-6", starred && "fill-current text-foreground")}
                strokeWidth={1.5}
              />
            </MotionPop>
          </button>
        </div>
      </div>

      {caption && (
        <div className="px-3 pb-3 text-sm leading-snug">
          <p className="whitespace-pre-wrap break-words">
            <Link href={`/u/${username}`} className="font-semibold mr-1.5 hover:opacity-80">
              {username}
            </Link>
            <TranslatableText
              text={captionPreview}
              as="span"
              stopPropagation
              className="whitespace-pre-wrap break-words"
            />
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

      {post.poll && <PostPollCard postId={post.id} poll={post.poll} compact />}

      {displayError && <p className="px-3 pb-2 text-xs text-destructive">{displayError}</p>}
    </article>
  );
}
