"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS, ja, zhCN } from "date-fns/locale";
import { Heart, MessageCircle, Star } from "lucide-react";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PostRepostMenu } from "@/components/post/post-repost-menu";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { formatNumber, cn } from "@/lib/utils";
import type { GridPost } from "@/components/feed/feed-post-card";
import { PostPollCard } from "@/components/post/post-poll-card";
import { PostCollaboratorsHeader } from "@/components/post/post-collaborators-header";
import { MotionPop } from "@/components/motion/motion-primitives";
import { useOptimisticLike, useOptimisticStar } from "@/lib/use-optimistic-engage";
import { PaidPostMediaGrid } from "@/components/profile/paid-post-media-grid";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import { TranslatableText } from "@/components/ui/translatable-text";
import { postHasVisualMedia } from "@/lib/format-feed";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/i18n/config";

const dateLocales: Record<Locale, typeof ko> = {
  ko,
  en: enUS,
  ja,
  zh: zhCN,
};

export function FeedTimelinePostCard({
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const { locale } = useLocale();

  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const isOwner = session?.user?.id === post.author.id;
  const hasMedia = postHasVisualMedia(post);
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
    <article className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex gap-3 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <PostCollaboratorsHeader
                author={post.author}
                collaborators={post.collaborators}
                trailing={
                  <Link href={`/post/${post.id}`} className="hover:underline">
                    <time dateTime={createdAt.toISOString()}>
                      {formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocales[locale] })}
                    </time>
                  </Link>
                }
              />
              {post.title && (
                <Link href={`/post/${post.id}`} className="block">
                  <p className="font-semibold text-[15px] mb-1">{post.title}</p>
                </Link>
              )}
              {post.content && (
                <div
                  className="cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a, button, [role='link']")) return;
                    router.push(`/post/${post.id}`);
                  }}
                >
                  <TranslatableText
                    text={post.content}
                    as="p"
                    stopPropagation
                    className="text-[15px] whitespace-pre-wrap break-words"
                  />
                </div>
              )}
              {hasMedia && post.media && (
                <PaidPostMediaGrid
                  media={post.media as ProfilePostMediaItem[]}
                  postId={post.id}
                  authorUsername={post.author.username}
                  authorId={post.author.id}
                  paymentsEnabled={false}
                  mediaTotal={post._count?.media ?? post.media.length}
                  postInstantPurchasePriceKrw={post.instantPurchasePriceKrw}
                />
              )}
              {post.poll && <div className="mt-3"><PostPollCard postId={post.id} poll={post.poll} compact /></div>}
            </div>
            <PostOwnerMenu postId={post.id} isPinned={post.isPinned} isOwner={isOwner} />
          </div>
        </div>
      </div>
      <div
        className="flex items-center justify-between px-4 py-2 border-t border-border/60 text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
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
            href={`/post/${post.id}#comments`}
            className="flex items-center gap-1 hover:text-folk-cobalt min-h-8 px-2 rounded-lg hover:bg-muted/50"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{formatNumber(post._count?.comments ?? 0)}</span>
          </Link>
          <PostRepostMenu
            postId={post.id}
            authorUsername={post.author.username}
            title={post.title}
            content={post.content}
            initialReposted={initialReposted}
            repostCount={post._count?.reposts ?? 0}
            requireLogin={requireLogin}
            onActionError={setActionError}
          />
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
          onClick={handleStar}
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
      {displayError && <p className="px-4 pb-2 text-xs text-destructive">{displayError}</p>}
    </article>
  );
}
