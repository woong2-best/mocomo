import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS, ja, zhCN } from "date-fns/locale";
import { Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { Locale } from "@/lib/i18n/config";
import type { getPostDetail } from "@/lib/post-queries";
import { PostPollCard } from "@/components/post/post-poll-card";
import { PostOwnerMenu } from "@/components/post/post-owner-menu";
import { TranslatableText } from "@/components/ui/translatable-text";
import { PaidPostMediaGrid } from "@/components/profile/paid-post-media-grid";

const dateLocales = { ko, en: enUS, ja, zh: zhCN } as const;

export function PostDetailCard({
  post,
  locale,
  isOwner = false,
  paymentsEnabled = false,
  subscriptionPriceKrw,
  subscribed = false,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getPostDetail>>>;
  locale: Locale;
  isOwner?: boolean;
  paymentsEnabled?: boolean;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
}) {
  const dateLocale = dateLocales[locale] ?? ko;

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
          <Link href={`/u/${post.author.username}`}>
            <Avatar>
              <AvatarImage src={post.author.image ?? undefined} />
              <AvatarFallback>{post.author.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/u/${post.author.username}`} className="hover:text-primary">
              <DisplayNameWithSupportTier
                name={post.author.name || post.author.username}
                tier={post.author.supportTierSent}
                nameClassName="font-semibold"
                compact
              />
            </Link>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(post.createdAt, { addSuffix: true, locale: dateLocale })}
            </p>
          </div>
          {isOwner && (
            <PostOwnerMenu
              postId={post.id}
              isPinned={post.isPinned}
              isOwner
              size="md"
            />
          )}
        </div>
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
