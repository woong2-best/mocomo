import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { getCosplayBoardPost } from "@/lib/cosplay-board-data";
import { Button } from "@/components/ui/button";

export default function CosplayBoardPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = getCosplayBoardPost(id);

  if (!post) notFound();

  const modeLabel = post.mode === "rental" ? "코스프레 대여" : "구매";

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" asChild>
        <Link href={post.mode === "purchase" ? "/cosplay?mode=purchase" : "/cosplay"}>
          <ArrowLeft className="h-4 w-4" />
          목록
        </Link>
      </Button>

      <article className="rounded-lg border border-[#b8b8b8] dark:border-border overflow-hidden bg-white dark:bg-card shadow-sm">
        <header className="border-b border-[#d6d6d6] dark:border-border px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded bg-[#3b4890] px-2 py-0.5 font-bold text-white">
              {modeLabel}
            </span>
            {post.region && <span>{post.region}</span>}
            <span className="inline-flex items-center gap-1 ml-auto">
              <Eye className="h-3 w-3" />
              {post.viewCount}
            </span>
          </div>
          <h1 className="text-lg font-bold leading-snug">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{post.author}</span>
            <span>{post.createdAt}</span>
            <span className="font-bold text-[#3b4890] dark:text-primary">{post.priceLabel}</span>
          </div>
        </header>

        <div className="px-4 py-6 min-h-[12rem]">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        <footer className="border-t border-[#d6d6d6] dark:border-border px-4 py-3 bg-[#f7f7f7] dark:bg-muted/30 text-xs text-muted-foreground">
          댓글 {post.commentCount}개 · 실제 거래는 DM 또는 중고거래로 연결됩니다.
        </footer>
      </article>
    </div>
  );
}
