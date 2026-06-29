"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Camera, PenSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  cosplayBoardListHref,
  formatCosplayBoardDate,
  parseCosplayBoardMode,
  type CosplayBoardListItem,
  type CosplayBoardMode,
} from "@/lib/cosplay-board-data";
import { Button } from "@/components/ui/button";
import { DbSetupBanner } from "@/components/ui/db-setup-banner";
import { NativePageTitle } from "@/components/layout/app-page-chrome";

const MODES: { id: CosplayBoardMode; label: string }[] = [
  { id: "rental", label: "코스프레 대여" },
  { id: "purchase", label: "구매" },
];

function BoardRow({ post, index }: { post: CosplayBoardListItem; index: number }) {
  return (
    <tr
      className={cn(
        "border-b border-[#d6d6d6] dark:border-border/60 hover:bg-[#f5f8ff] dark:hover:bg-muted/40 transition-colors",
        post.isNotice && "bg-[#fff8e8] dark:bg-amber-950/20"
      )}
    >
      <td className="py-2 px-2 text-center text-[11px] text-muted-foreground tabular-nums">
        {post.isNotice ? (
          <span className="font-bold text-[#c0392b]">공지</span>
        ) : (
          index
        )}
      </td>
      <td className="py-2 px-2 min-w-0">
        <Link
          href={`/cosplay/board/${post.id}`}
          className="block truncate text-[13px] text-[#222] dark:text-foreground hover:underline"
        >
          <span className="font-medium">{post.title}</span>
          {post.commentCount > 0 && (
            <span className="ml-1 text-[11px] font-bold text-[#3b4890] dark:text-primary">
              [{post.commentCount}]
            </span>
          )}
          <span className="ml-2 text-[11px] text-[#888] dark:text-muted-foreground">
            {post.priceLabel}
          </span>
        </Link>
      </td>
      <td className="py-2 px-2 text-center hidden sm:table-cell">
        <Link
          href={`/u/${post.authorUsername}`}
          className="text-[12px] text-[#555] dark:text-muted-foreground hover:underline truncate block max-w-[6rem] mx-auto"
        >
          {post.author}
        </Link>
      </td>
      <td className="py-2 px-2 text-center text-[11px] text-[#888] dark:text-muted-foreground hidden md:table-cell tabular-nums">
        {formatCosplayBoardDate(post.createdAt)}
      </td>
      <td className="py-2 px-2 text-center text-[11px] text-[#888] dark:text-muted-foreground hidden md:table-cell tabular-nums">
        {post.viewCount}
      </td>
    </tr>
  );
}

export function CosplayBoard({
  initialMode,
  posts,
  totalCount,
  currentPage,
  totalPages,
  dbReady,
}: {
  initialMode: CosplayBoardMode;
  posts: CosplayBoardListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  dbReady: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const mode = parseCosplayBoardMode(searchParams.get("mode") ?? initialMode);
  const page = Math.max(1, Number(searchParams.get("page")) || currentPage);

  const setMode = useCallback(
    (next: CosplayBoardMode) => {
      if (next === mode) return;
      startTransition(() => {
        router.replace(cosplayBoardListHref(next), { scroll: false });
      });
    },
    [mode, router]
  );

  const goPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
      startTransition(() => {
        router.replace(cosplayBoardListHref(mode, nextPage), { scroll: false });
      });
    },
    [mode, page, router, totalPages]
  );

  const regularPosts = posts.filter((p) => !p.isNotice);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <NativePageTitle>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-folk-cobalt">
              <Camera className="h-5 w-5 text-pink-500" />
              코스프레 마켓
            </h1>
            <p className="text-xs text-muted-foreground mt-1">대여·구매 게시판</p>
          </div>
        </NativePageTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs" asChild>
            <Link href="/cosplay/profiles">
              <Users className="h-3.5 w-3.5" />
              코스어 프로필
            </Link>
          </Button>
          <Button size="sm" className="rounded-lg gap-1.5 text-xs" asChild>
            <Link href={`/cosplay/board/new?mode=${mode}`}>
              <PenSquare className="h-3.5 w-3.5" />
              글쓰기
            </Link>
          </Button>
        </div>
      </div>

      {!dbReady && (
        <DbSetupBanner title="코스프레 게시판 DB가 준비되지 않았습니다. Supabase SQL 섹션 Z5 실행 후 다시 시도해 주세요." />
      )}

      <div className="flex items-center justify-center">
        <div
          className="inline-flex rounded-full border-2 border-[#3b4890]/30 bg-[#eef1fb] dark:bg-muted/40 p-1 shadow-sm"
          role="tablist"
          aria-label="코스프레 게시판 분류"
        >
          {MODES.map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(item.id)}
                className={cn(
                  "relative min-w-[7.5rem] sm:min-w-[9rem] px-4 py-2 rounded-full text-sm font-bold transition-all duration-200",
                  active
                    ? "bg-[#3b4890] text-white shadow-md"
                    : "text-[#3b4890] dark:text-foreground hover:bg-white/70 dark:hover:bg-background/60"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border border-[#b8b8b8] dark:border-border overflow-hidden bg-white dark:bg-card shadow-sm",
          pending && "opacity-70"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#d6d6d6] dark:border-border bg-[#f7f7f7] dark:bg-muted/30 text-[11px] text-muted-foreground">
          <span>
            {mode === "rental" ? "코스프레 대여" : "구매"} 게시판 · 총{" "}
            <strong className="text-foreground">{totalCount}</strong>개
          </span>
          <span className="hidden sm:inline">번호 · 제목 · 글쓴이 · 날짜 · 조회</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse">
            <thead>
              <tr className="bg-[#3b4890] text-white text-[11px]">
                <th className="w-12 py-2 px-2 font-semibold">번호</th>
                <th className="py-2 px-2 text-left font-semibold">제목</th>
                <th className="w-24 py-2 px-2 font-semibold hidden sm:table-cell">글쓴이</th>
                <th className="w-16 py-2 px-2 font-semibold hidden md:table-cell">날짜</th>
                <th className="w-14 py-2 px-2 font-semibold hidden md:table-cell">조회</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                    {dbReady ? (
                      <>
                        등록된 글이 없습니다.{" "}
                        <Link href={`/cosplay/board/new?mode=${mode}`} className="text-primary hover:underline">
                          첫 글 올리기
                        </Link>
                      </>
                    ) : (
                      "게시판을 불러올 수 없습니다."
                    )}
                  </td>
                </tr>
              ) : (
                posts.map((post, i) => {
                  const regularIndex = posts.slice(0, i + 1).filter((p) => !p.isNotice).length;
                  const displayNum = post.isNotice
                    ? null
                    : regularPosts.length - regularIndex + 1;
                  return (
                    <BoardRow key={post.id} post={post} index={displayNum ?? 0} />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 px-3 py-2 border-t border-[#d6d6d6] dark:border-border bg-[#f7f7f7] dark:bg-muted/30">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => goPage(n)}
                className={cn(
                  "inline-flex h-7 min-w-7 items-center justify-center rounded border text-[11px] font-bold transition-colors",
                  n === page
                    ? "border-[#3b4890] bg-[#3b4890] text-white"
                    : "border-[#ccc] dark:border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
