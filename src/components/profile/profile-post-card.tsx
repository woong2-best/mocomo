import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Pin, Repeat2 } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import type { GridPost } from "@/components/feed/feed-post-card";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import { PaidPostMediaGrid } from "@/components/profile/paid-post-media-grid";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";

export function ProfilePostCard({
  post,
  meta,
  isSelf = false,
  pinnedHighlight = false,
  paymentsEnabled = false,
  authorId,
  subscriptionPriceKrw,
  subscribed = false,
}: {
  post: GridPost & { createdAt: Date | string; isPinned?: boolean };
  meta?: string;
  isSelf?: boolean;
  pinnedHighlight?: boolean;
  paymentsEnabled?: boolean;
  authorId?: string;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
}) {
  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const displayName = userDisplayName(post.author);
  const showPinned = pinnedHighlight || post.isPinned;

  return (
    <article
      className={cn(
        "relative px-4 py-3 border-b border-border/60 hover:bg-muted/30 transition-colors",
        pinnedHighlight && "bg-muted/15 border-l-4 border-l-primary/70"
      )}
    >
      {showPinned && (
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium">
          <Pin className="h-3.5 w-3.5" />
          고정됨
        </p>
      )}
      {meta && (
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Repeat2 className="h-3 w-3" />
          {meta}
        </p>
      )}
      <div className="flex gap-3">
        <Link href={`/u/${post.author.username}`} className="shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.image ?? undefined} />
            <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap text-sm">
                <Link href={`/u/${post.author.username}`} className="hover:underline">
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
                    {formatDistanceToNow(createdAt, { addSuffix: true, locale: ko })}
                  </time>
                </Link>
              </div>
              <Link href={`/post/${post.id}`} className="block mt-1">
                {post.title && <p className="font-semibold text-[15px]">{post.title}</p>}
                <p className="text-[15px] whitespace-pre-wrap break-words line-clamp-6">{post.content}</p>
              </Link>
              {post.media && post.media.length > 0 && (
                <PaidPostMediaGrid
                  media={post.media as ProfilePostMediaItem[]}
                  postId={post.id}
                  authorUsername={post.author.username}
                  authorId={authorId ?? post.author.id}
                  subscriptionPriceKrw={subscriptionPriceKrw}
                  paymentsEnabled={paymentsEnabled}
                  subscribed={subscribed}
                />
              )}
              <div className="flex gap-6 mt-3 text-muted-foreground text-xs">
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {formatNumber(post._count?.comments ?? 0)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {formatNumber(post._count?.likes ?? 0)}
                </span>
              </div>
            </div>
            {isSelf && (
              <PostOwnerMenu
                postId={post.id}
                isPinned={!!post.isPinned}
                isOwner
                size="md"
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
