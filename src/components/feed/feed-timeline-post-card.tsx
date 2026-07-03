"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS, ja, zhCN } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Star } from "lucide-react";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PostRepostMenu } from "@/components/post/post-repost-menu";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { formatNumber, cn } from "@/lib/utils";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { GridPost } from "@/components/feed/feed-post-card";
import { PostPollCard } from "@/components/post/post-poll-card";
import { MotionPop } from "@/components/motion/motion-primitives";
import { engageStar, postEngage } from "@/lib/post-engage-client";
import { PaidPostMediaGrid } from "@/components/profile/paid-post-media-grid";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import { LinkifiedText } from "@/components/ui/linkified-text";
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
  const [liked, setLiked] = useState(initialLiked);
  const [starred, setStarred] = useState(initialStarred);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [busy, setBusy] = useState<"like" | "star" | null>(null);
  const [actionError, setActionError] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const { locale } = useLocale();

  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const displayName = userDisplayName(post.author);
  const isOwner = session?.user?.id === post.author.id;
  const hasMedia = postHasVisualMedia(post);

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
      setActionError(err instanceof Error ? err.message : "Failed");
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
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex gap-3 p-4 pb-3">
        <Link href={`/u/${post.author.username}`} className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.image ?? undefined} />
            <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap text-sm">
                <Link href={`/u/${post.author.username}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                  <DisplayNameWithSupportTier
                    name={displayName}
                    tier={post.author.supportTierSent ?? "PEBBLE"}
                    nameClassName="font-bold"
                    compact
                  />
                </Link>
                <span className="text-muted-foreground truncate">@{post.author.username}</span>
                <span className="text-muted-foreground">·</span>
                <Link href={`/post/${post.id}`} className="text-muted-foreground shrink-0 hover:underline">
                  <time dateTime={createdAt.toISOString()}>
                    {formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocales[locale] })}
                  </time>
                </Link>
              </div>
              <Link href={`/post/${post.id}`} className="block mt-2">
                {post.title && <p className="font-semibold text-[15px] mb-1">{post.title}</p>}
                {post.content && (
                  <LinkifiedText
                    text={post.content}
                    as="p"
                    stopPropagation
                    className="text-[15px] whitespace-pre-wrap break-words"
                  />
                )}
              </Link>
              {hasMedia && post.media && (
                <PaidPostMediaGrid
                  media={post.media as ProfilePostMediaItem[]}
                  postId={post.id}
                  authorUsername={post.author.username}
                  authorId={post.author.id}
                  paymentsEnabled={false}
                  linkToPost
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
            disabled={busy === "like"}
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
          disabled={busy === "star"}
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
      {actionError && <p className="px-4 pb-2 text-xs text-destructive">{actionError}</p>}
    </article>
  );
}
