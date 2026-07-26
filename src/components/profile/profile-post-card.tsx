import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Pin, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GridPost } from "@/components/feed/feed-post-card";
import { TranslatableText } from "@/components/ui/translatable-text";
import { PaidPostMediaGrid } from "@/components/profile/paid-post-media-grid";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { PostCollaboratorsHeader } from "@/components/post/post-collaborators-header";
import { PostEngagementBar } from "@/components/post/post-engagement-bar";

export function ProfilePostCard({
  post,
  meta,
  isSelf = false,
  pinnedHighlight = false,
  paymentsEnabled = false,
  authorId,
  subscriptionPriceKrw,
  subscribed = false,
  initialLiked = false,
  initialStarred = false,
  initialReposted = false,
}: {
  post: GridPost & { createdAt: Date | string; isPinned?: boolean };
  meta?: string;
  isSelf?: boolean;
  pinnedHighlight?: boolean;
  paymentsEnabled?: boolean;
  authorId?: string;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
}) {
  const createdAt = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
  const showPinned = pinnedHighlight || post.isPinned;
  const canOwnMenu = isSelf && (!authorId || post.author.id === authorId);

  return (
    <article
      className={cn(
        "relative px-4 py-3 border-b border-border/60 hover:bg-muted/30 transition-colors min-w-0 max-w-full overflow-hidden",
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
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <PostCollaboratorsHeader
                author={post.author}
                collaborators={post.collaborators}
                trailing={
                  <Link href={`/post/${post.id}`} className="hover:underline">
                    <time dateTime={createdAt.toISOString()}>
                      {formatDistanceToNow(createdAt, {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </time>
                  </Link>
                }
              />
              <div className="mt-1">
                {post.title && (
                  <Link href={`/post/${post.id}`} className="block">
                    <p className="font-semibold text-[15px]">{post.title}</p>
                  </Link>
                )}
                <TranslatableText
                  text={post.content}
                  as="p"
                  stopPropagation
                  className="text-[15px] whitespace-pre-wrap break-words line-clamp-6"
                />
              </div>
              {post.media && post.media.length > 0 && (
                <PaidPostMediaGrid
                  media={post.media as ProfilePostMediaItem[]}
                  postId={post.id}
                  authorUsername={post.author.username}
                  authorId={authorId ?? post.author.id}
                  subscriptionPriceKrw={subscriptionPriceKrw}
                  paymentsEnabled={paymentsEnabled}
                  subscribed={subscribed}
                  postInstantPurchasePriceKrw={post.instantPurchasePriceKrw}
                  mediaTotal={post._count?.media ?? post.media.length}
                />
              )}
              <PostEngagementBar
                className="mt-3"
                postId={post.id}
                authorUsername={post.author.username}
                title={post.title}
                content={post.content}
                hasVideo={post.media?.some((m) => m.type === "VIDEO")}
                likeCount={post._count?.likes ?? 0}
                commentCount={post._count?.comments ?? 0}
                repostCount={post._count?.reposts ?? 0}
                viewCount={post.viewCount ?? 0}
                initialLiked={initialLiked}
                initialStarred={initialStarred}
                initialReposted={initialReposted}
              />
            </div>
            <PostOwnerMenu
              postId={post.id}
              isPinned={!!post.isPinned}
              isOwner={canOwnMenu}
              authorId={post.author.id}
              authorUsername={post.author.username}
              size="md"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
