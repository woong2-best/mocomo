"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Star } from "lucide-react";
import { ReplyBubbleIcon } from "@/components/icons/reply-bubble-icon";
import { PostShareMenu } from "@/components/post/post-share-menu";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { PostDetailMedia } from "@/components/post/post-detail-media";
import { PostViewCount } from "@/components/post/post-view-count";
import { PostViewTracker } from "@/components/post/post-view-tracker";
import { TranslatableText } from "@/components/ui/translatable-text";
import { useOptimisticStar } from "@/lib/use-optimistic-engage";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { communityCategoryLabel } from "@/lib/community-labels";
import { formatQnaBountyMoco } from "@/lib/qna-bounty-format";
import { qnaListTitle } from "@/lib/qna-list-title";
import type { Locale } from "@/lib/i18n/config";
import type { PostDetailOk } from "@/lib/post-queries";
import { cn, formatNumber } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export function QnaQuestionPanel({
  post,
  locale,
  isOwner = false,
  commentCount,
  initialStarred = false,
  paymentsEnabled = false,
  subscriptionPriceKrw,
  subscribed = false,
  viewerShowNsfw = false,
}: {
  post: PostDetailOk;
  locale: Locale;
  isOwner?: boolean;
  commentCount: number;
  initialStarred?: boolean;
  paymentsEnabled?: boolean;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
  viewerShowNsfw?: boolean;
}) {
  const { t } = useLocale();
  const star = useOptimisticStar(post.id, initialStarred);
  const session = useSession();
  const router = useRouter();
  const title = qnaListTitle(post);
  const category = post.community
    ? communityCategoryLabel(
        post.community.category ?? "",
        post.community.customCategoryLabel,
        locale
      )
    : "";
  const bountyCenti = post.qnaBountyCenti ?? 0;
  const accepted = Boolean(post.acceptedCommentId);

  function requireLogin() {
    if (session.status === "loading") return false;
    if (session.data?.user) return true;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/post/${post.id}#answers`)}`);
    return false;
  }

  return (
    <article className="space-y-5 pb-2">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[22px] font-bold leading-snug tracking-tight text-foreground">
          <span className="text-folk-cobalt">Q. </span>
          <TranslatableText text={title} as="span" showLinkPreview={false} />
        </h1>
        <PostOwnerMenu
          postId={post.id}
          isPinned={post.isPinned}
          isOwner={isOwner}
          authorId={post.isAnonymous ? undefined : post.author.id}
          authorUsername={post.isAnonymous ? undefined : post.author.username}
          anonymous={!!post.isAnonymous}
          qna
          size="md"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {post.isAnonymous ? t("tower.anonymous") : post.author.name || post.author.username}
        {" · "}
        {t("post.views", { count: formatNumber(post.viewCount) })}
        {" · "}
        {format(post.createdAt, "yyyy.MM.dd")}
      </p>

      {post.content && post.content.trim() !== title ? (
        <TranslatableText text={post.content} as="p" className="whitespace-pre-wrap text-[15px] leading-7" />
      ) : null}

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

      <div className="flex flex-wrap items-center gap-2">
        {category ? (
          <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {category}
          </span>
        ) : null}
        {bountyCenti > 0 ? (
          <span className="inline-flex rounded-full bg-folk-gold/20 px-3 py-1 text-xs font-semibold text-folk-cobalt">
            {t("qna.bounty_badge", { amount: formatQnaBountyMoco(bountyCenti) })}
          </span>
        ) : null}
        {accepted ? (
          <span className="inline-flex rounded-full bg-folk-cobalt/10 px-3 py-1 text-xs font-semibold text-folk-cobalt">
            {t("qna.accepted")}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-y border-border/70 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`#answers`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-muted-foreground hover:border-folk-cobalt/40 hover:text-folk-cobalt"
          >
            <ReplyBubbleIcon className="h-4 w-4" />
            <span>{formatNumber(commentCount)}</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!requireLogin()) return;
              void star.toggle();
            }}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm",
              star.starred
                ? "border-folk-gold/50 bg-folk-gold/15 text-folk-cobalt"
                : "border-border text-muted-foreground hover:border-folk-cobalt/40 hover:text-folk-cobalt"
            )}
          >
            <Star className={cn("h-4 w-4", star.starred && "fill-folk-gold text-folk-gold")} />
            {t("qna.also_curious")}
          </button>
          <PostShareMenu
            postId={post.id}
            authorUsername={post.author.username}
            title={title}
            content={post.content}
            size="detail"
          />
        </div>
        <PostViewTracker postId={post.id} initialCount={post.viewCount}>
          {(views) => <PostViewCount count={views} size="detail" />}
        </PostViewTracker>
      </div>
    </article>
  );
}
