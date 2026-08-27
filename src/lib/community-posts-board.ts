export type CommunityPostsBoardTab = "all" | "best" | "notice";

export type CommunityPostsBoardItem = {
  id: string;
  title: string | null;
  content: string;
  isPinned: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  authorUsername: string;
  authorName: string;
};

export function parseCommunityPostsTab(value: string | null | undefined): CommunityPostsBoardTab {
  if (value === "notice") return "notice";
  if (value === "best") return "best";
  return "all";
}

export function postDisplayTitle(post: Pick<CommunityPostsBoardItem, "title" | "content">): string {
  const title = post.title?.trim();
  if (title) return title;
  const line = post.content.trim().split("\n")[0] ?? "";
  return line.length > 80 ? `${line.slice(0, 80)}…` : line || "(제목 없음)";
}

/** DC 갤러리 스타일 — 오늘이면 HH:MM, 올해면 MM.DD, 이전이면 YY.MM.DD */
export function formatCommunityPostDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${mo}.${d}`;
  }
  const y = String(date.getFullYear()).slice(-2);
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${mo}.${d}`;
}

export function filterCommunityPostsByTab(
  posts: CommunityPostsBoardItem[],
  tab: CommunityPostsBoardTab
): CommunityPostsBoardItem[] {
  if (tab === "notice") return posts.filter((p) => p.isPinned);
  if (tab === "best") return posts.filter((p) => p.likeCount >= 3);
  return posts;
}

export function sortCommunityPostsForBoard(
  posts: CommunityPostsBoardItem[],
  tab: CommunityPostsBoardTab
): CommunityPostsBoardItem[] {
  const pinned = posts.filter((p) => p.isPinned);
  const rest = posts.filter((p) => !p.isPinned);
  if (tab === "best") {
    return [
      ...pinned.sort((a, b) => b.likeCount - a.likeCount),
      ...rest.sort((a, b) => b.likeCount - a.likeCount || b.viewCount - a.viewCount),
    ];
  }
  return [
    ...pinned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    ...rest.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  ];
}
