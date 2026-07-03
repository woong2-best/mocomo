"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS, ja, zhCN } from "date-fns/locale";
import { ChevronDown, ChevronUp, Heart, ImageIcon, MessageCircle, Star } from "lucide-react";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PostRepostMenu } from "@/components/post/post-repost-menu";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { formatNumber, cn } from "@/lib/utils";
import type { GridPost } from "@/components/feed/feed-post-card";
import { PostPollCard } from "@/components/post/post-poll-card";
import { MotionPop } from "@/components/motion/motion-primitives";
import { engageStar, postEngage } from "@/lib/post-engage-client";
import { PaidPostMediaGrid } from "@/components/profile/paid-post-media-grid";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/i18n/config";
import { userDisplayName } from "@/lib/user-public-select";

const PREVIEW_LEN = 72;

const dateLocales: Record<Locale, typeof ko> = {
  ko,
  en: enUS,
  ja,
  zh: zhCN,
};

function previewText(post: GridPost) {
  const raw = [post.title, post.content].filter(Boolean).join(" — ").trim();
  if (!raw) return "…";
  return raw.length > PREVIEW_LEN ? `${raw.slice(0, PREVIEW_LEN).trim()}…` : raw;
}

export function FeedCompactPostCard({
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
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(initialLiked);
  const [starred, setStarred] = useState(initialStarred);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [busy, setBusy] = useState<"like" | "star" | null>(null);
  const [actionError, setActionError] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const { locale, t } = useLocale();

  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const displayName = userDisplayName(post.author);
  const isOwner = session?.user?.id === post.author.id;
  const hasMedia = postHasVisualMedia(post);
  const commentCount = post._count?.comments ?? 0;

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
    <article className="border-b border-border/70 bg-card/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <p className="flex-1 min-w-0 text-sm font-medium truncate">{previewText(post)}</p>
          <div className="flex items-center gap-2 shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {hasMedia && (
              <span className="inline-flex items-center gap-0.5 text-folk-cobalt/80" title={t("feed.displayMode.compactHasMedia")}>
                <ImageIcon className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {formatNumber(commentCount)}
            </span>
            <span className={cn("flex items-center gap-0.5", liked && "text-folk-terracotta")}>
              <Heart className={cn("h-3 w-3", liked && "fill-current")} />
              {formatNumber(likeCount)}
            </span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            )}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground truncate">
          {displayName} · @{post.author.username} ·{" "}
          {formatDistanceToNow(createdAt, { addSuffix: true, locale: dateLocales[locale] })}
        </p>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border/40 bg-muted/10">
          <div className="pt-3 space-y-2">
            {post.title && <p className="font-semibold text-sm">{post.title}</p>}
            {post.content && (
              <LinkifiedText
                text={post.content}
                as="p"
                className="text-sm whitespace-pre-wrap break-words text-foreground/90"
              />
            )}
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
            {post.poll && <PostPollCard postId={post.id} poll={post.poll} compact />}
          </div>
          <div
            className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                disabled={busy === "like"}
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1 min-h-8 px-2 rounded-lg",
                  liked ? "text-folk-terracotta" : "hover:bg-muted/50"
                )}
              >
                <MotionPop trigger={liked}>
                  <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                </MotionPop>
                <span>{formatNumber(likeCount)}</span>
              </button>
              <Link
                href={`/post/${post.id}#comments`}
                className="flex items-center gap-1 min-h-8 px-2 rounded-lg hover:bg-muted/50"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{formatNumber(commentCount)}</span>
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
              <Link href={`/post/${post.id}`} className="text-xs text-primary hover:underline px-2">
                {t("feed.displayMode.openPost")}
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <PostOwnerMenu postId={post.id} isPinned={post.isPinned} isOwner={isOwner} size="sm" />
              <button
                type="button"
                disabled={busy === "star"}
                onClick={handleStar}
                className={cn(
                  "min-h-8 min-w-8 flex items-center justify-center rounded-lg",
                  starred ? "text-folk-gold" : "text-folk-gold/60 hover:bg-muted/50"
                )}
              >
                <MotionPop trigger={starred}>
                  <Star className={cn("h-3.5 w-3.5", starred && "fill-folk-gold text-folk-gold")} />
                </MotionPop>
              </button>
            </div>
          </div>
          {actionError && <p className="mt-1 text-xs text-destructive">{actionError}</p>}
        </div>
      )}
    </article>
  );
}
