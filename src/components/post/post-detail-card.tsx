import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS, ja, zhCN } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import type { Locale } from "@/lib/i18n/config";
import type { getPostDetail } from "@/lib/post-queries";

const dateLocales = { ko, en: enUS, ja, zh: zhCN } as const;

export function PostDetailCard({
  post,
  locale,
}: {
  post: NonNullable<Awaited<ReturnType<typeof getPostDetail>>>;
  locale: Locale;
}) {
  const dateLocale = dateLocales[locale] ?? ko;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.author.username}`}>
            <Avatar>
              <AvatarImage src={post.author.image ?? undefined} />
              <AvatarFallback>{post.author.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
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
        </div>
        {post.title && <h1 className="text-xl font-bold">{post.title}</h1>}
        <p className="whitespace-pre-wrap">{post.content}</p>
        {post.media.map((m) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.id} src={m.url} alt="" className="rounded-lg max-w-full" loading="lazy" />
        ))}
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
