import Link from "next/link";
import { ArrowLeft, Eye, MessageSquare } from "lucide-react";
import { getCosplayBoardPostDetail } from "@/actions/cosplay-board";
import { getCachedSession } from "@/lib/auth";
import { cosplayBoardListHref, formatCosplayBoardDate } from "@/lib/cosplay-board-data";
import { CosplayBoardComments } from "@/components/cosplay/cosplay-board-comments";
import { CosplayBoardContactBar } from "@/components/cosplay/cosplay-board-contact-bar";
import { Button } from "@/components/ui/button";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { userDisplayName } from "@/lib/user-public-select";
import { notFound } from "next/navigation";

export default async function CosplayBoardPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, session] = await Promise.all([getCosplayBoardPostDetail(id), getCachedSession()]);

  if (!post) notFound();

  const modeLabel = post.mode === "rental" ? "코스프레 대여" : "구매";
  const isAuthor = session?.user?.id === post.author.id;

  return (
    <AppPageChrome maxWidth="3xl" spacing="sm">
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" asChild>
        <Link href={cosplayBoardListHref(post.mode)}>
          <ArrowLeft className="h-4 w-4" />
          목록
        </Link>
      </Button>

      <article className="rounded-lg border border-[#b8b8b8] dark:border-border overflow-hidden bg-white dark:bg-card shadow-sm">
        <header className="border-b border-[#d6d6d6] dark:border-border px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded bg-[#3b4890] px-2 py-0.5 font-bold text-white">{modeLabel}</span>
            {post.region && <span>{post.region}</span>}
            {post.workTitle && <span>· {post.workTitle}</span>}
            {post.character && <span>· {post.character}</span>}
            {post.sizeLabel && <span>· {post.sizeLabel}</span>}
            <span className="inline-flex items-center gap-1 ml-auto">
              <Eye className="h-3 w-3" />
              {post.viewCount}
            </span>
          </div>
          <h1 className="text-lg font-bold leading-snug">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Link href={`/u/${post.author.username}`} className="hover:text-primary">
              <DisplayNameWithSupportTier
                name={userDisplayName(post.author)}
                tier={post.author.supportTierSent}
                nameClassName="font-semibold text-foreground text-xs"
                compact
              />
            </Link>
            <span>{formatCosplayBoardDate(post.createdAt)}</span>
            <span className="font-bold text-[#3b4890] dark:text-primary">{post.priceLabel}</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {post.commentCount}
            </span>
          </div>
        </header>

        {post.images.length > 0 && (
          <div className="px-4 pt-4 grid gap-2 grid-cols-2 sm:grid-cols-3">
            {post.images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="w-full aspect-square object-cover rounded-lg border border-border/60"
              />
            ))}
          </div>
        )}

        <div className="px-4 py-6 min-h-[10rem]">
          <LinkifiedText text={post.content} as="p" className="text-sm leading-relaxed whitespace-pre-wrap" />
        </div>

        {!isAuthor && (
          <CosplayBoardContactBar
            authorId={post.author.id}
            authorUsername={post.author.username}
            postTitle={post.title}
            isSignedIn={!!session?.user}
          />
        )}

        <CosplayBoardComments
          postId={post.id}
          initialComments={post.comments}
          isSignedIn={!!session?.user}
        />
      </article>
    </AppPageChrome>
  );
}
