"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { galleryAuthorLabel } from "@/lib/community-author";
import {
  filterCommunityPostsByTab,
  formatCommunityPostDate,
  parseCommunityPostsTab,
  postDisplayTitle,
  sortCommunityPostsForBoard,
  type CommunityPostsBoardItem,
  type CommunityPostsBoardTab,
} from "@/lib/community-posts-board";

const TABS: { id: CommunityPostsBoardTab; label: string }[] = [
  { id: "all", label: "전체글" },
  { id: "notice", label: "공지" },
];

function BoardRow({
  post,
  displayNo,
}: {
  post: CommunityPostsBoardItem;
  displayNo: number | null;
}) {
  const title = postDisplayTitle(post);
  const writer = galleryAuthorLabel(post.authorName, post.authorUsername, post.isAnonymous);

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
      <td className="py-2 px-2 text-center hidden sm:table-cell w-36">
        {post.isAnonymous ? (
          <span className="text-[12px] text-[#555] dark:text-muted-foreground truncate block max-w-[9rem] mx-auto" title={writer}>
            {writer}
          </span>
        ) : (
          <Link
            href={`/u/${post.authorUsername}`}
            className="text-[12px] text-[#555] dark:text-muted-foreground hover:underline truncate block max-w-[9rem] mx-auto"
            title={writer}
          >
            {writer}
          </Link>
        )}
      </td>
      <td className="py-2 px-2 text-center text-[11px] text-[#888] dark:text-muted-foreground hidden md:table-cell tabular-nums w-16">
        {formatCommunityPostDate(post.createdAt)}
      </td>
      <td className="py-2 px-2 text-center text-[11px] text-[#888] dark:text-muted-foreground hidden md:table-cell tabular-nums w-14">
        {post.viewCount.toLocaleString("ko-KR")}
      </td>
    </tr>
  );
}

export function CommunityPostsBoard({
  posts,
  communitySlug,
}: {
  posts: CommunityPostsBoardItem[];
  communitySlug: string;
}) {
  const searchParams = useSearchParams();
  const tab = parseCommunityPostsTab(searchParams.get("tab"));
  const pageSize = 50;

  const filtered = useMemo(() => {
    const list = filterCommunityPostsByTab(posts, tab);
    return sortCommunityPostsForBoard(list, tab).slice(0, pageSize);
  }, [posts, tab]);

  const regularPosts = filtered.filter((p) => !p.isPinned);

  return (
    <div className="space-y-2">
      <nav className="flex items-center gap-1 text-[13px] font-bold">
        {TABS.map((t) => {
          const active = tab === t.id;
          const href = t.id === "all" ? `/c/${communitySlug}` : `/c/${communitySlug}?tab=${t.id}`;
          return (
            <Link
              key={t.id}
              href={href}
              className={cn(
                "rounded-md px-3 py-1.5",
                active
                  ? "bg-[#3b4890] text-white"
                  : "text-[#3b4890] dark:text-primary hover:bg-[#3b4890]/10"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
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
    </div>
  );
}
