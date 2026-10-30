import { formatDistanceToNow } from "date-fns";
import { Pin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n/config";
import { dateFnsLocale } from "@/lib/i18n/date-locale";
import type { PostDetailOk } from "@/lib/post-queries";
import { PostPollCard } from "@/components/post/post-poll-card";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { PostCollaboratorsHeader } from "@/components/post/post-collaborators-header";
import { PostCollabActions } from "@/components/post/post-collab-actions";
import { TranslatableText } from "@/components/ui/translatable-text";
import { PostDetailMedia } from "@/components/post/post-detail-media";
import { QuotePostPreviewCard } from "@/components/post/quote-post-preview-card";
import { BlockedQuotedPostCard } from "@/components/post/blocked-quoted-post-card";
import { readQuotedPost } from "@/lib/quoted-post";
import { createTranslator } from "@/lib/i18n/messages";
import { isBoostableImageMedia } from "@/lib/sponsored-ad/boostable";
import { PostSponsoredAdBadge } from "@/components/post/post-sponsored-ad-badge";

const t = createTranslator("en");

export function PostDetailCard({
  post,
  locale,
  isOwner = false,
  paymentsEnabled = false,
  subscriptionPriceKrw,
  subscribed = false,
  viewerCollabStatus = null,
  viewerShowNsfw = false,
  quotedPostBlocked = false,
  sponsoredAdActive = false,
}: {
  post: PostDetailOk;
  quotedPostBlocked?: boolean;
  sponsoredAdActive?: boolean;
  locale: Locale;
  isOwner?: boolean;
  paymentsEnabled?: boolean;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
  viewerCollabStatus?: "PENDING" | "ACCEPTED" | null;
  viewerShowNsfw?: boolean;
}) {
  const dateLocale = dateFnsLocale(locale);
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
            {t("ui.pinned_to_profile")}
          </p>
        )}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <PostCollaboratorsHeader
              author={post.author}
              collaborators={collaborators}
              size="md"
              qna={Boolean(post.community)}
              anonymous={!!post.isAnonymous}
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
          <div className="flex flex-col items-end gap-1 shrink-0">
            {sponsoredAdActive ? <PostSponsoredAdBadge /> : null}
            <div className="flex items-center gap-1">
            <PostOwnerMenu
              postId={post.id}
              isPinned={post.isPinned}
              isOwner={isOwner}
              authorId={post.isAnonymous ? undefined : post.author.id}
              authorUsername={post.isAnonymous ? undefined : post.author.username}
              anonymous={!!post.isAnonymous}
              qna={Boolean(post.community)}
              size="md"
              canBoost={isOwner && isBoostableImageMedia(post.media)}
            />
            </div>
          </div>
        </div>
        <PostCollabActions
          postId={post.id}
          status={viewerCollabStatus}
          isAuthor={isOwner}
        />
        {post.title && (
          <h1 className={post.community ? "text-xl font-bold text-folk-cobalt" : "text-xl font-bold"}>
            {post.title}
          </h1>
        )}
        {post.content ? (
          <TranslatableText
            text={post.content}
            mentionStates={(post as { mentionStates?: unknown }).mentionStates}
            as="p"
            className="whitespace-pre-wrap"
          />
        ) : null}
        {quotedPostBlocked ? (
          <BlockedQuotedPostCard className="mt-3" />
        ) : (
          (() => {
            const quoted = readQuotedPost(post);
            if (!quoted) return null;
            return (
              <QuotePostPreviewCard
                post={quoted}
                href={`/post/${quoted.id}`}
                className="mt-3"
                isOwner={isOwner}
                viewerShowNsfw={viewerShowNsfw}
              />
            );
          })()
        )}
        {post.poll && <PostPollCard postId={post.id} poll={post.poll} isAuthor={isOwner} />}
        <PostDetailMedia
          media={(post.media ?? []).map((m) => ({
            id: m.id,
            url: m.url,
            type: m.type,
            priceKrw: m.priceKrw ?? undefined,
            locked: m.locked,
            lockReason: m.lockReason,
            instantPurchasePriceKrw: m.instantPurchasePriceKrw,
            width: m.width,
            height: m.height,
            duration: m.duration,
            hlsUrl: m.hlsUrl,
            posterUrl: m.posterUrl,
          }))}
          postId={post.id}
          authorUsername={post.author.username}
          authorId={post.author.id}
          subscriptionPriceKrw={subscriptionPriceKrw}
          paymentsEnabled={paymentsEnabled}
          subscribed={subscribed}
          postInstantPurchasePriceKrw={post.instantPurchasePriceKrw}
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
