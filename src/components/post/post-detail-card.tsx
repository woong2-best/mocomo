import { formatDistanceToNow } from "date-fns";
import { ko, enUS, ja, zhCN } from "date-fns/locale";
import { Pin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";
import type { getPostDetail, PostDetailLocked } from "@/lib/post-queries";
import { PostPollCard } from "@/components/post/post-poll-card";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { PostCollaboratorsHeader } from "@/components/post/post-collaborators-header";
import { PostCollabManageDialog } from "@/components/post/post-collab-manage-dialog";
import { PostCollabActions } from "@/components/post/post-collab-actions";
import { TranslatableText } from "@/components/ui/translatable-text";
import { PaidPostMediaGrid } from "@/components/profile/paid-post-media-grid";

const dateLocales = { ko, en: enUS, ja, zh: zhCN } as const;

type PostDetailOk = Exclude<
  NonNullable<Awaited<ReturnType<typeof getPostDetail>>>,
  PostDetailLocked
>;

export function PostDetailCard({
  post,
  locale,
  isOwner = false,
  paymentsEnabled = false,
  subscriptionPriceKrw,
  subscribed = false,
  viewerCollabStatus = null,
  viewerShowNsfw = false,
}: {
  post: PostDetailOk;
  locale: Locale;
  isOwner?: boolean;
  paymentsEnabled?: boolean;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
  viewerCollabStatus?: "PENDING" | "ACCEPTED" | null;
  viewerShowNsfw?: boolean;
}) {
  const dateLocale = dateLocales[locale] ?? ko;
  const collaborators =
    "collaborators" in post && Array.isArray(post.collaborators)
      ? post.collaborators
      : [];

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {post.isPinned && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
            <Pin className="h-4 w-4" />
            프로필에 고정된 게시물
          </p>
        )}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
        <PostCollaboratorsHeader
          author={post.author}
          collaborators={collaborators}
          size="md"
          trailing={
            <span>
              {formatDistanceToNow(post.createdAt, {
                addSuffix: true,
                locale: dateLocale,
              })}
            </span>
          }
        />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isOwner && <PostCollabManageDialog postId={post.id} />}
            <PostOwnerMenu
              postId={post.id}
              isPinned={post.isPinned}
              isOwner={isOwner}
              authorId={post.author.id}
              authorUsername={post.author.username}
              size="md"
            />
          </div>
        </div>
        <PostCollabActions
          postId={post.id}
          status={viewerCollabStatus}
          isAuthor={isOwner}
        />
        {post.title && <h1 className="text-xl font-bold">{post.title}</h1>}
        <TranslatableText text={post.content} as="p" className="whitespace-pre-wrap" />
        {post.poll && <PostPollCard postId={post.id} poll={post.poll} />}
        <PaidPostMediaGrid
          media={(post.media ?? []).map((m) => ({
            id: m.id,
            url: m.url,
            type: m.type,
            priceKrw: m.priceKrw ?? undefined,
            locked: m.locked,
            lockReason: m.lockReason,
            instantPurchasePriceKrw: m.instantPurchasePriceKrw,
          }))}
          postId={post.id}
          authorUsername={post.author.username}
          authorId={post.author.id}
          subscriptionPriceKrw={subscriptionPriceKrw}
          paymentsEnabled={paymentsEnabled}
          subscribed={subscribed}
          linkToPost={false}
          postInstantPurchasePriceKrw={post.instantPurchasePriceKrw}
          mediaTotal={(post.media ?? []).length}
          isNsfw={post.isNsfw}
          isOwner={isOwner}
          viewerShowNsfw={viewerShowNsfw}
        />
        <div className="flex gap-2 flex-wrap">
          {post.tags.map(({ tag }) => (
            <span key={tag.id} className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
              #{tag.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
