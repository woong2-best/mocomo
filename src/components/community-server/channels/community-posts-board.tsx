"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterCommunityPostsByTab,
  formatCommunityPostDate,
  postDisplayTitle,
  sortCommunityPostsForBoard,
  type CommunityPostsBoardItem,
} from "@/lib/community-posts-board";

function BoardRow({
  post,
  displayNo,
}: {
  post: CommunityPostsBoardItem;
  displayNo: number | null;
}) {
  const title = postDisplayTitle(post);

  return (
    <tr
      className={cn(
        "border-b border-[#e8e8e8] dark:border-border/60 hover:bg-[#f5f8ff] dark:hover:bg-muted/40 transition-colors",
        post.isPinned && "bg-[#fff8e8] dark:bg-amber-950/20"
      )}
    >
      <td className="py-2 px-2 text-center text-[11px] text-muted-foreground tabular-nums w-14">
        {post.isPinned ? (
          <span className="font-bold text-[#c0392b] dark:text-red-400">공지</span>
        ) : (
          displayNo
        )}
      </td>
      <td className="py-2 px-2 min-w-0">
        <Link
          href={`/post/${post.id}`}
          className="flex items-center gap-1 min-w-0 text-[13px] text-[#222] dark:text-foreground hover:underline"
        >
          {post.commentCount > 0 ? (
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
          ) : null}
          <span className="truncate font-medium">{title}</span>
          {post.commentCount > 0 ? (
            <span className="shrink-0 text-[11px] font-bold text-[#3b4890] dark:text-primary">
              [{post.commentCount}]
            </span>
          ) : null}
        </Link>
      </td>
      <td className="py-2 px-2 text-center hidden sm:table-cell w-24">
        <Link
          href={`/u/${post.authorUsername}`}
          className="text-[12px] text-[#555] dark:text-muted-foreground hover:underline truncate block max-w-[6rem] mx-auto"
        >
          {post.authorName}
        </Link>
      </td>
      <td className="py-2 px-2 text-center text-[11px] text-[#888] dark:text-muted-foreground hidden md:table-cell tabular-nums w-16">
        {formatCommunityPostDate(post.createdAt)}
      </td>
      <td className="py-2 px-2 text-center text-[11px] text-[#888] dark:text-muted-foreground hidden md:table-cell tabular-nums w-14">
        {post.viewCount.toLocaleString("ko-KR")}
      </td>
      <td className="py-2 px-2 text-center text-[11px] text-[#888] dark:text-muted-foreground hidden lg:table-cell tabular-nums w-14">
        {post.likeCount.toLocaleString("ko-KR")}
      </td>
    </tr>
  );
}

export function CommunityPostsBoard({
  posts,
}: {
  posts: CommunityPostsBoardItem[];
  communitySlug: string;
}) {
  const pageSize = 50;

  const filtered = useMemo(() => {
    const list = filterCommunityPostsByTab(posts, "all");
    return sortCommunityPostsForBoard(list, "all").slice(0, pageSize);
  }, [posts]);

  const regularPosts = filtered.filter((p) => !p.isPinned);

  return (
    <div className="rounded-lg border border-[#b8b8b8] dark:border-border overflow-hidden bg-white dark:bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse">
          <thead>
            <tr className="bg-[#3b4890] text-white text-[11px]">
              <th className="py-2 px-2 font-semibold">번호</th>
              <th className="py-2 px-2 text-left font-semibold">제목</th>
              <th className="py-2 px-2 font-semibold hidden sm:table-cell">글쓴이</th>
              <th className="py-2 px-2 font-semibold hidden md:table-cell">작성일</th>
              <th className="py-2 px-2 font-semibold hidden md:table-cell">조회</th>
              <th className="py-2 px-2 font-semibold hidden lg:table-cell">추천</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                  등록된 글이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((post, i) => {
                const regularIndex = filtered.slice(0, i + 1).filter((p) => !p.isPinned).length;
                const displayNo = post.isPinned ? null : regularPosts.length - regularIndex + 1;
                return <BoardRow key={post.id} post={post} displayNo={displayNo} />;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
